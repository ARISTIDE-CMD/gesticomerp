import { supabase } from '@/lib/supabase'

export async function getCommandes() {
    const { data, error } = await supabase
        .from('commandes')
        .select('*, client:clients(id, nom), lignes:ligne_commandes(id, quantite, prix_unitaire, article:articles(id, reference, designation))')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

export async function createCommande(commande, lignes) {
    const { data: userData } = await supabase.auth.getUser()
    const createdBy = userData?.user?.id ?? null
    const montantTotal = lignes.reduce((sum, l) => sum + l.quantite * l.prix, 0)

    const { data, error } = await supabase
        .from('commandes')
        .insert({
            ...commande,
            created_by: commande.created_by ?? createdBy,
            montant_total: commande.montant_total ?? montantTotal,
        })
        .select()
        .single()

    if (error) throw error

    const lignesToInsert = lignes.map(l => ({
        commande_id: data.id,
        article_id: l.article_id,
        quantite: l.quantite,
        prix_unitaire: l.prix
    }))

    const { error: ligneError } = await supabase
        .from('ligne_commandes')
        .insert(lignesToInsert)

    if (ligneError) throw ligneError

    return data
}

export async function updateCommande(id, updates) {
    const { error } = await supabase
        .from('commandes')
        .update(updates)
        .eq('id', id)

    if (error) throw error
}

export async function deleteCommande(id) {
    const { error: lignesError } = await supabase
        .from('ligne_commandes')
        .delete()
        .eq('commande_id', id)

    if (lignesError) throw lignesError

    const { error } = await supabase
        .from('commandes')
        .delete()
        .eq('id', id)

    if (error) throw error
}
