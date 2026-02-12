import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    console.log("Request received", { method: req.method });

    let body: { commande_id?: string; type_document?: string } = {};
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("Invalid JSON body", parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { commande_id, type_document } = body;

    if (!commande_id) {
      return new Response(JSON.stringify({ error: "commande_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      console.error("Missing envs", { hasUrl: !!supabaseUrl, hasServiceKey: !!serviceKey });
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: commande, error } = await supabase
      .from("commandes")
      .select(
        "id, numero_commande, created_at, montant_total, client:clients(nom, telephone, adresse), lignes:ligne_commandes(quantite, prix_unitaire, article:articles(reference, designation))"
      )
      .eq("id", commande_id)
      .single();

    if (error) {
      console.error("Commande fetch error", error);
      throw error;
    }
    if (!commande) {
      return new Response(JSON.stringify({ error: "Commande not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const drawText = (text: string, x: number, y: number, size = 12) => {
      page.drawText(text, { x, y, size, font, color: rgb(0.1, 0.2, 0.35) });
    };

    drawText("Molige ERP", 50, 800, 18);
    drawText(type_document?.toUpperCase?.() || "DOCUMENT", 50, 780, 12);

    drawText(`Commande: ${commande.numero_commande ?? commande.id}`, 50, 750, 12);
    drawText(`Date: ${commande.created_at ? new Date(commande.created_at).toLocaleDateString() : "-"}`, 50, 735, 12);

    drawText("Client:", 50, 710, 12);
    drawText(commande.client?.nom ?? "-", 50, 695, 12);
    drawText(commande.client?.telephone ?? "", 50, 680, 10);
    drawText(commande.client?.adresse ?? "", 50, 665, 10);

    drawText("Articles", 50, 630, 12);

    let y = 610;
    commande.lignes?.forEach((line: any) => {
      const designation = line.article?.designation ?? line.article?.reference ?? "-";
      const qty = line.quantite ?? 0;
      const price = Number(line.prix_unitaire ?? 0).toFixed(2);
      const total = Number((line.quantite ?? 0) * (line.prix_unitaire ?? 0)).toFixed(2);
      drawText(`${designation} | Qte: ${qty} | PU: ${price} | Total: ${total}`, 50, y, 10);
      y -= 16;
    });

    drawText(`Montant total: ${Number(commande.montant_total ?? 0).toFixed(2)} EUR`, 50, y - 10, 12);

    const pdfBytes = await pdfDoc.save();

    const fileName = `${commande.numero_commande ?? commande.id}-${type_document || "document"}.pdf`;
    const filePath = `documents/${commande.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      console.error("Storage upload error", uploadError);
      throw uploadError;
    }

    const { data: publicData } = supabase.storage.from("documents").getPublicUrl(filePath);
    const fileUrl = publicData.publicUrl;

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        type_document: type_document ?? "facture",
        fichier_url: fileUrl,
        commande_id,
      })
      .select()
      .single();

    if (docError) {
      console.error("Document insert error", docError);
      throw docError;
    }

    return new Response(JSON.stringify({ document: doc, url: fileUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error", err);
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
