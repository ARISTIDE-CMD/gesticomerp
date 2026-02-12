import { supabase } from '@/lib/supabase'

export async function getUsers() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

export async function updateUser(id, updates) {
    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)

    if (error) throw error
}

export async function deleteUser(id) {
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)

    if (error) throw error
}
