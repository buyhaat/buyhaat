const SUPABASE_URL = "https://kppqrhqkwxwloootpmuc.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_LbOwpkT5uf25H-A89P9ZGg_Zt7GP4ke";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
