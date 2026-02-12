import { supabase } from '@/lib/supabase'

export async function getDocuments() {
    const { data, error } = await supabase
        .from('documents')
        .select('*, commande:commandes(id, numero_commande, montant_total, client:clients(nom))')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

export async function createDocument(document) {
    const { error } = await supabase
        .from('documents')
        .insert(document)

    if (error) throw error
}

export async function updateDocument(id, updates) {
    const { error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)

    if (error) throw error
}

export async function deleteDocument(id) {
    const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)

    if (error) throw error
}
