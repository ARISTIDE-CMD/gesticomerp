import { supabase } from '@/lib/supabase'

export async function getMyProfile() {
    const { data: user } = await supabase.auth.getUser()
    if (!user?.user) return null

    const { data: profileUpper, error: profileUpperError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.user.id)
        .maybeSingle()

    if (profileUpperError) throw profileUpperError
    if (profileUpper) {
        return {
            ...profileUpper,
            email: user.user.email ?? null,
            _profile_table: 'profiles',
        }
    }

    const { data: profileLower, error: profileLowerError } = await supabase
        .from('profils')
        .select('*')
        .eq('id', user.user.id)
        .maybeSingle()

    if (profileLowerError) throw profileLowerError
    if (profileLower) {
        return {
            ...profileLower,
            email: user.user.email ?? null,
            _profile_table: 'profils',
        }
    }

    return {
        id: user.user.id,
        email: user.user.email ?? null,
        role: null,
    }
}

async function getUserOrThrow() {
    const { data } = await supabase.auth.getUser()
    if (!data?.user?.id) {
        throw new Error('Session invalide. Reconnectez-vous.')
    }
    return data.user
}

async function tryUpdateAvatarInTable(tableName, userId, avatarUrl) {
    const { data, error } = await supabase
        .from(tableName)
        .update({ avatar_url: avatarUrl })
        .eq('id', userId)
        .select('*')
        .maybeSingle()

    if (error) {
        if (
            error.code === '42P01' ||
            error.code === '42703' ||
            error.code === '42501' ||
            error.code === 'PGRST204' ||
            String(error.message || '').toLowerCase().includes('schema cache') ||
            String(error.message || '').toLowerCase().includes('row-level security')
        ) {
            return null
        }
        throw error
    }

    if (!data) return null
    return data
}

export async function updateMyProfileAvatar(avatarUrl) {
    const user = await getUserOrThrow()
    const currentProfile = await getMyProfile()
    const preferredTable = currentProfile?._profile_table
    const tables = preferredTable
        ? [preferredTable, preferredTable === 'profiles' ? 'profils' : 'profiles']
        : ['profiles', 'profils']

    const updatedPrimary = await tryUpdateAvatarInTable(tables[0], user.id, avatarUrl)
    if (updatedPrimary) {
        return {
            ...updatedPrimary,
            email: user.email ?? null,
            _profile_table: tables[0],
        }
    }

    const updatedFallback = await tryUpdateAvatarInTable(tables[1], user.id, avatarUrl)
    if (updatedFallback) {
        return {
            ...updatedFallback,
            email: user.email ?? null,
            _profile_table: tables[1],
        }
    }

    throw new Error(
        "RLS bloque la mise a jour du profil. Ajoutez une policy UPDATE pour profiles/profils (id = auth.uid())."
    )
}

export async function uploadMyProfileAvatar(file) {
    if (!file) throw new Error("Aucun fichier selectionne.")

    const user = await getUserOrThrow()
    const ext = (file.name?.split('.').pop() || 'png').toLowerCase()
    const path = `${user.id}/avatar-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type || undefined,
        })

    if (uploadError) {
        if (uploadError.message?.toLowerCase().includes('bucket')) {
            throw new Error(
                "Bucket avatars introuvable. Creez le bucket avatars dans Storage puis reessayez."
            )
        }
        throw uploadError
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const avatarUrl = data?.publicUrl
    if (!avatarUrl) {
        throw new Error("Impossible de recuperer l'URL publique de l'avatar.")
    }

    return updateMyProfileAvatar(avatarUrl)
}
