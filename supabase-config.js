// BuyHaat — Supabase Configuration

window.SUPABASE_URL = "https://kppqrhqkwxwloootpmuc.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_LbOwpkT5uf25H-A89P9ZGg_Zt7GP4ke";

// Global Supabase Client Initialization
if (window.supabase && window.supabase.createClient) {
  window.supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );
  // app.js-এ যাতে সরাসরি supabase ভ্যারিয়েবল ব্যবহার করা যায়
  window.supabase = window.supabaseClient;
} else {
  console.error("Supabase CDN Library is not loaded properly in index.html!");
}
