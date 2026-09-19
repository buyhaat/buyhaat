/* =========================================================
   BUYHAAT APP ENGINE
   ========================================================= */

const sb = window.supabaseClient || window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
);

/* Helper Methods */
const $ = (id) => document.getElementById(id);

const esc = (value) =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

const money = (value) =>
    "৳" + Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 });

function createSlug(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\u0980-\u09ff]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-+/g, "-")
        .slice(0, 120);
}

function toast(message) {
    const el = $("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
        el.classList.remove("show");
    }, 2500);
}

/* Image Upload Handler */
async function uploadImage(file, folder) {
    if (!file) return null;
    if (!file.type.startsWith("image/")) {
        toast("শুধু Image file নির্বাচন করো।");
        return null;
    }

    const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "jpg";
    const randomId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const fileName = `${folder}/${randomId}.${ext}`;

    const { error } = await sb.storage.from("store-images").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
    });

    if (error) {
        console.error("Image upload error:", error);
        toast(error.message || "Image upload failed");
        return null;
    }

    const { data } = sb.storage.from("store-images").getPublicUrl(fileName);
    return data?.publicUrl || null;
}

/* State Management */
let products = [];
let stores = [];
let categories = ["All"];
let followedStores = [];
let currentUser = null;
let currentMyStore = null;
let currentCategory = "All";
let authMode = "login";
let editingProductId = null;
let editingProductImageUrl = null;

/* Menu & Navigation */
function closeMenu() {
    $("sideMenu")?.classList.remove("open");
    $("menuOverlay")?.classList.remove("show");
    document.body.classList.remove("menu-open");
}

function openMenu() {
    const page = (location.hash || "#home").slice(1).split("?")[0];
    if (page !== "home") {
        closeMenu();
        return;
    }
    $("sideMenu")?.classList.add("open");
    $("menuOverlay")?.classList.add("show");
    document.body.classList.add("menu-open");
}

function go(page) {
    closeMenu();
    location.hash = "#" + page;
}

function route() {
    let page = (location.hash || "#home").slice(1).split("?")[0];
    const valid = ["home", "following", "add-product", "chat", "my-store", "product-detail"];

    if (!valid.includes(page)) {
        page = "home";
        if (location.hash !== "#home") history.replaceState(null, "", "#home");
    }

    document.querySelectorAll(".page").forEach((el) => {
        el.classList.toggle("active-page", el.id === page);
    });

    document.querySelectorAll(".bottom button").forEach((el) => {
        el.classList.toggle("active", el.dataset.route === page);
    });

    const isHome = page === "home";
    $("menuBtn")?.classList.toggle("hidden", !isHome);
    $("headerSearchBtn")?.classList.toggle("hidden", !isHome);

    closeMenu();

    if (page === "home") {
        renderCategories();
        renderProducts(currentCategory, $("searchInput")?.value || "");
    } else if (page === "following") {
        renderFollowing();
    } else if (page === "my-store") {
        renderMyStore();
    } else if (page === "add-product") {
        updateAddProductNotice();
    }

    window.scrollTo({ top: 0, behavior: "auto" });
}

window.addEventListener("hashchange", route);

/* Auth Management */
async function updateAuth() {
    if (!sb?.auth) return true;
    const { data, error } = await sb.auth.getSession();
    if (error) return false;

    currentUser = data?.session?.user || null;

    if (!currentUser) {
        currentMyStore = null;
        followedStores = [];
        updateAccount();
        updateAddProductNotice();
        return true;
    }

    const { data: profile } = await sb
        .from("profiles")
        .select("id, role, is_active")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (profile && profile.role !== "admin" && profile.is_active !== true) {
        await sb.auth.signOut();
        currentUser = null;
        currentMyStore = null;
        followedStores = [];
        updateAccount();
        updateAddProductNotice();
        toast("তোমার account বর্তমানে Blocked।");
        return false;
    }

    await loadMyStore();
    await loadFollowing();
    updateAccount();
    updateAddProductNotice();
    return true;
}

async function loadMyStore() {
    currentMyStore = null;
    if (!currentUser) return;

    const { data } = await sb
        .from("stores")
        .select("*")
        .eq("owner_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    currentMyStore = data || null;
}

function updateAccount() {
    const status = $("accountStatus");
    if (!status) return;

    if (!currentUser) {
        status.innerHTML = `
            <div class="card">
                <b>Guest User</b><br>
                <span class="sub-text">Login করলে Store management ব্যবহার করতে পারবে।</span>
            </div>
        `;
        $("loginBtn")?.classList.remove("hidden");
        $("logoutBtn")?.classList.add("hidden");
        $("createStoreBtn")?.classList.add("hidden");
        return;
    }

    status.innerHTML = `
        <div class="card">
            <b>${esc(currentUser.email)}</b><br>
            <span class="sub-text">Logged in</span>
        </div>
    `;

    $("loginBtn")?.classList.add("hidden");
    $("logoutBtn")?.classList.remove("hidden");
    $("createStoreBtn")?.classList.toggle("hidden", !!currentMyStore);
}

function openAuth(mode = "login") {
    authMode = mode;
    $("authTitle").textContent = mode === "login" ? "Login" : "Create Account";
    $("authSubtitle").textContent = mode === "login" ? "তোমার BuyHaat account-এ login করো।" : "নতুন BuyHaat account তৈরি করো।";
    $("authSubmitBtn").textContent = mode === "login" ? "Login" : "Register";
    $("authSwitchBtn").textContent = mode === "login" ? "নতুন অ্যাকাউন্ট তৈরি করুন" : "আগের অ্যাকাউন্টে Login করুন";
    $("authMessage").textContent = "";
    $("authModal").classList.remove("hidden");
}

function closeAuth() {
    $("authModal")?.classList.add("hidden");
}

async function authSubmit(event) {
    event.preventDefault();
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    let result = authMode === "login" 
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password });

    if (result.error) {
        $("authMessage").textContent = result.error.message;
        return;
    }

    if (authMode === "register" && !result.data?.session) {
        $("authMessage").textContent = "Account তৈরি হয়েছে। Email verify করে Login করো।";
        return;
    }

    const authOK = await updateAuth();
    if (!authOK) return;

    closeAuth();
    toast(authMode === "login" ? "Login successful" : "Account created successfully");
    route();
}

async function logout() {
    await sb.auth.signOut();
    currentUser = null;
    currentMyStore = null;
    followedStores = [];
    updateAccount();
    updateAddProductNotice();
    closeMenu();
    go("home");
    toast("Logged out");
}

/* Data Loaders & Renderers */
async function loadStores() {
    if (!sb) return;
    const { data } = await sb
        .from("stores")
        .select("*")
        .eq("is_active", true)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
    stores = data || [];
}

async function loadProducts() {
    if (!sb) return;
    const { data } = await sb
        .from("products")
        .select("*, categories(name), stores(id, name, slug, is_active, is_approved)")
        .eq("is_active", true)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

    products = (data || [])
        .filter(p => p.stores && p.stores.is_active && p.stores.is_approved)
        .map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug || "",
            price: Number(p.price),
            description: p.description || "",
            stock: Number(p.stock || 0),
            category: p.categories?.name || "Others",
            store: p.stores?.name || "Unknown Store",
            storeSlug: p.stores?.slug || "",
            storeId: p.store_id,
            image: p.image_url || null
        }));

    renderProducts(currentCategory, $("searchInput")?.value || "");
}

function renderProducts(category = "All", query = "") {
    currentCategory = category;
    const q = String(query || "").trim().toLowerCase();
    const clean = q.replace(/^@/, "");

    const productList = products.filter((p) => {
        const categoryOK = category === "All" || p.category === category;
        const text = [p.name, p.store, p.storeSlug, p.category, p.description].join(" ").toLowerCase();
        return categoryOK && (!q || text.includes(q) || text.includes(clean));
    });

    const box = $("products");
    if (!box) return;

    if ($("productCount")) $("productCount").textContent = `${productList.length} products`;

    if (!productList.length) {
        box.innerHTML = `<div class="empty"><p>কোনো Product বা Store পাওয়া যায়নি।</p></div>`;
        return;
    }

    box.innerHTML = productList.map((p) => `
        <article class="product-card" data-id="${esc(p.id)}">
            ${p.image ? `<img class="product-image" src="${esc(p.image)}" alt="${esc(p.name)}">` : `<div class="product-image"></div>`}
            <div class="product-info">
                <div class="product-name">${esc(p.name)}</div>
                <div class="price">${money(p.price)}</div>
                <div class="store-name">${esc(p.store)}</div>
                <div class="stock-text">${Number(p.stock) > 0 ? `Stock: ${p.stock}` : "Out of stock"}</div>
            </div>
        </article>
    `).join("");

    box.querySelectorAll(".product-card").forEach(card => {
        card.onclick = () => openProduct(card.dataset.id);
    });
}

/* Category Filters */
async function loadCategories() {
    if (!sb) return;
    const { data } = await sb.from("categories").select("id, name").order("name");
    categories = ["All", ...(data || []).map(x => x.name)];
    renderCategories();
    populateCategory();
}

function renderCategories() {
    const box = $("categories");
    if (!box) return;

    box.innerHTML = categories.map(name => `
        <button class="category ${name === currentCategory ? "active" : ""}" data-cat="${esc(name)}" type="button">
            ${esc(name)}
        </button>
    `).join("");

    box.querySelectorAll(".category").forEach(btn => {
        btn.onclick = () => {
            currentCategory = btn.dataset.cat;
            renderCategories();
            renderProducts(currentCategory, $("searchInput")?.value || "");
        };
    });
}

function populateCategory() {
    const select = $("productCategory");
    if (!select) return;

    select.innerHTML = categories
        .filter(x => x !== "All")
        .map(x => `<option value="${esc(x)}">${esc(x)}</option>`)
        .join("");
}

/* Add Product Notice Helper */
function updateAddProductNotice() {
    const notice = $("addNotice");
    if (!notice) return;

    if (!currentUser) {
        notice.innerHTML = `<div class="empty"><p>Product add করতে আগে Login করো।</p></div>`;
        return;
    }
    if (!currentMyStore) {
        notice.innerHTML = `<div class="empty"><p>Product add করার আগে একটি Store তৈরি করো।</p></div>`;
        return;
    }
    notice.innerHTML = `
        <div class="empty">
            <p><b>${esc(currentMyStore.name)}</b> Store-এর জন্য Product add করছো। Admin approval-এর পর public হবে।</p>
        </div>
    `;
}

/* Init System */
function init() {
    document.querySelectorAll("[data-route]").forEach(el => {
        el.onclick = () => go(el.dataset.route);
    });

    $("menuBtn")?.addEventListener("click", openMenu);
    $("closeMenuBtn")?.addEventListener("click", closeMenu);
    $("menuOverlay")?.addEventListener("click", closeMenu);

    $("loginBtn")?.addEventListener("click", () => openAuth("login"));
    $("logoutBtn")?.addEventListener("click", logout);
    $("createStoreBtn")?.addEventListener("click", () => $("storeModal").classList.remove("hidden"));

    $("closeAuthBtn")?.addEventListener("click", closeAuth);
    $("authSwitchBtn")?.addEventListener("click", () => openAuth(authMode === "login" ? "register" : "login"));
    $("authForm")?.addEventListener("submit", authSubmit);

    $("closeStoreBtn")?.addEventListener("click", () => $("storeModal").classList.add("hidden"));
    $("closeProductEditBtn")?.addEventListener("click", () => $("productEditModal").classList.add("hidden"));

    $("searchInput")?.addEventListener("input", () => {
        renderProducts(currentCategory, $("searchInput").value || "");
    });

    (async () => {
        await updateAuth();
        await loadCategories();
        await loadStores();
        await loadProducts();
        route();
    })();
}

document.addEventListener("DOMContentLoaded", init);
