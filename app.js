/* =========================================================
   BUYHAAT APP
   Supabase + Auth + Stores + Products
   File Upload + Product Management + Orders + Following
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const sb =
    window.supabaseClient ||
    window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
    );


/* =========================================================
   HELPERS
========================================================= */

const $ = (id) => document.getElementById(id);

const esc = (value) =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");


const money = (value) =>
    "৳" +
    Number(value || 0).toLocaleString("en-BD", {
        maximumFractionDigits: 2
    });


/* =========================================================
   CREATE SLUG
========================================================= */

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


/* =========================================================
   TOAST
========================================================= */

function toast(message) {

    const el = $("toast");

    if (!el) return;

    el.textContent = message;

    el.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {

        el.classList.remove("show");

    }, 2400);
}


/* =========================================================
   IMAGE UPLOAD
   Supabase Storage bucket: store-images
========================================================= */

async function uploadImage(file, folder) {

    if (!file) return null;

    if (!file.type.startsWith("image/")) {

        toast("শুধু Image file নির্বাচন করো।");

        return null;
    }

    const ext =
        file.name.includes(".")
            ? file.name.split(".").pop().toLowerCase()
            : "jpg";

    const randomId =
        crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`;

    const fileName =
        `${folder}/${randomId}.${ext}`;

    const {
        error
    } =
        await sb.storage
            .from("store-images")
            .upload(
                fileName,
                file,
                {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type
                }
            );

    if (error) {

        console.error(
            "Image upload error:",
            error
        );

        toast(
            error.message ||
            "Image upload failed"
        );

        return null;
    }

    const {
        data
    } =
        sb.storage
            .from("store-images")
            .getPublicUrl(fileName);

    return data?.publicUrl || null;
}


/* =========================================================
   APP STATE
========================================================= */

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


/* =========================================================
   ROUTING + MENU
========================================================= */

function closeMenu() {

    $("sideMenu")?.classList.remove("open");

    $("menuOverlay")?.classList.remove("show");

    document.body.classList.remove(
        "menu-open"
    );
}


function openMenu() {

    $("sideMenu")?.classList.add("open");

    $("menuOverlay")?.classList.add("show");

    document.body.classList.add(
        "menu-open"
    );
}


function go(page) {

    closeMenu();

    location.hash = "#" + page;
}


function route() {

    let page =
        (location.hash || "#home")
            .slice(1)
            .split("?")[0];

    const valid = [
        "home",
        "following",
        "add-product",
        "chat",
        "my-store",
        "product-detail"
    ];

    if (!valid.includes(page)) {

        page = "home";

        if (location.hash !== "#home") {

            history.replaceState(
                null,
                "",
                "#home"
            );
        }
    }

    document
        .querySelectorAll(".page")
        .forEach((el) => {

            el.classList.toggle(
                "active-page",
                el.id === page
            );

        });


    document
        .querySelectorAll(".bottom button")
        .forEach((el) => {

            el.classList.toggle(
                "active",
                el.dataset.route === page
            );

        });


    /*
       Menu button শুধু Home page-এ দেখাবে।
       তবে Menu নিজে অন্য page থেকেও ভুল করে খোলা
       থাকলে route() সেটি বন্ধ করে দেবে।
    */

    $("menuBtn")?.classList.toggle(
        "hidden",
        page !== "home"
    );


    $("headerSearchBtn")?.classList.toggle(
        "hidden",
        page !== "home"
    );


    closeMenu();


    if (page === "home") {

        renderCategories();

        renderProducts(
            currentCategory,
            $("searchInput")?.value || ""
        );
    }


    if (page === "following") {

        renderFollowing();
    }


    if (page === "my-store") {

        renderMyStore();
    }


    if (page === "add-product") {

        updateAddProductNotice();
    }


    window.scrollTo({
        top: 0,
        behavior: "auto"
    });
}


window.addEventListener(
    "hashchange",
    route
);


/* =========================================================
   ADD PRODUCT NOTICE
========================================================= */

function updateAddProductNotice() {

    const notice =
        $("addNotice");

    if (!notice) return;


    if (!currentUser) {

        notice.innerHTML = `
            <div class="empty">
                Product add করতে আগে Login করো।
            </div>
        `;

        return;
    }


    if (!currentMyStore) {

        notice.innerHTML = `
            <div class="empty">
                Product add করার আগে একটি Store তৈরি করো।
            </div>
        `;

        return;
    }


    notice.innerHTML = `
        <div class="empty">
            ${esc(currentMyStore.name)} Store-এর জন্য Product add করছো।
            Admin approval-এর পর Product public হবে।
        </div>
    `;
}


/* =========================================================
   AUTH
========================================================= */

async function updateAuth() {

    if (!sb?.auth) return;

    const {
        data,
        error
    } =
        await sb.auth.getSession();

    if (error) {

        console.error(
            "Auth session error:",
            error
        );

        return;
    }

    currentUser =
        data?.session?.user || null;

    await loadMyStore();

    await loadFollowing();

    updateAccount();

    updateAddProductNotice();
}


async function loadMyStore() {

    currentMyStore = null;

    if (!currentUser) return;


    const {
        data,
        error
    } =
        await sb
            .from("stores")
            .select("*")
            .eq(
                "owner_id",
                currentUser.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(1)
            .maybeSingle();


    if (error) {

        console.error(
            "My store error:",
            error
        );

        return;
    }


    currentMyStore =
        data || null;
}


function updateAccount() {

    const status =
        $("accountStatus");

    const loginBtn =
        $("loginBtn");

    const logoutBtn =
        $("logoutBtn");

    const createBtn =
        $("createStoreBtn");


    if (!status) return;


    if (!currentUser) {

        status.innerHTML = `
            <div class="card">

                <b>Guest user</b>

                <br>

                <span class="store-meta">
                    Login করলে Store management ব্যবহার করতে পারবে।
                </span>

            </div>
        `;


        loginBtn?.classList.remove(
            "hidden"
        );

        logoutBtn?.classList.add(
            "hidden"
        );

        createBtn?.classList.add(
            "hidden"
        );

        return;
    }


    status.innerHTML = `
        <div class="card">

            <b>
                ${esc(currentUser.email)}
            </b>

            <br>

            <span class="store-meta">
                Logged in
            </span>

        </div>
    `;


    loginBtn?.classList.add(
        "hidden"
    );

    logoutBtn?.classList.remove(
        "hidden"
    );


    createBtn?.classList.toggle(
        "hidden",
        !!currentMyStore
    );
}


function openAuth(mode = "login") {

    authMode = mode;


    $("authTitle").textContent =
        mode === "login"
            ? "Login"
            : "Create account";


    $("authSubtitle").textContent =
        mode === "login"
            ? "তোমার BuyHaat account-এ login করো।"
            : "নতুন BuyHaat account তৈরি করো।";


    $("authSubmitBtn").textContent =
        mode === "login"
            ? "Login"
            : "Register";


    $("authSwitchBtn").textContent =
        mode === "login"
            ? "নতুন অ্যাকাউন্ট তৈরি করুন"
            : "আগের অ্যাকাউন্টে Login করুন";


    $("authMessage").textContent = "";


    $("authModal").classList.remove(
        "hidden"
    );
}


function closeAuth() {

    $("authModal")?.classList.add(
        "hidden"
    );
}


async function authSubmit(event) {

    event.preventDefault();


    const email =
        $("authEmail").value.trim();


    const password =
        $("authPassword").value;


    let result;


    if (authMode === "login") {

        result =
            await sb.auth.signInWithPassword({
                email,
                password
            });

    } else {

        result =
            await sb.auth.signUp({
                email,
                password
            });
    }


    if (result.error) {

        $("authMessage").textContent =
            result.error.message;

        return;
    }


    if (
        authMode === "register" &&
        !result.data?.session
    ) {

        $("authMessage").textContent =
            "Account তৈরি হয়েছে। Email confirmation চালু থাকলে আগে email verify করে Login করো।";

        return;
    }


    closeAuth();

    await updateAuth();

    toast("Success");

    route();
}


async function logout() {

    const {
        error
    } =
        await sb.auth.signOut();


    if (error) {

        toast(error.message);

        return;
    }


    currentUser = null;

    currentMyStore = null;

    followedStores = [];


    updateAccount();

    updateAddProductNotice();

    closeMenu();

    go("home");

    toast("Logged out");
}


/* =========================================================
   STORES
========================================================= */

async function loadStores() {

    if (!sb) return;


    const {
        data,
        error
    } =
        await sb
            .from("stores")
            .select(`
                id,
                name,
                slug,
                logo_url,
                cover_url,
                description,
                phone,
                address,
                is_active,
                is_approved,
                owner_id,
                created_at
            `)
            .eq(
                "is_active",
                true
            )
            .eq(
                "is_approved",
                true
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Store error:",
            error
        );

        stores = [];

        return;
    }


    stores = data || [];
}


/* =========================================================
   PRODUCTS
========================================================= */

async function loadProducts() {

    if (!sb) return;


    const {
        data,
        error
    } =
        await sb
            .from("products")
            .select(`
                id,
                name,
                slug,
                price,
                description,
                stock,
                category_id,
                store_id,
                image_url,
                is_active,
                is_approved,
                created_at,

                categories(name),

                stores(
                    id,
                    name,
                    slug,
                    is_active,
                    is_approved
                )
            `)
            .eq(
                "is_active",
                true
            )
            .eq(
                "is_approved",
                true
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Product error:",
            error
        );

        products = [];

        renderProducts();

        return;
    }


    products =
        (data || [])
            .filter(
                (p) =>
                    p.stores &&
                    p.stores.is_active === true &&
                    p.stores.is_approved === true
            )
            .map((p) => ({

                id:
                    p.id,

                name:
                    p.name,

                slug:
                    p.slug || "",

                price:
                    Number(p.price),

                description:
                    p.description || "",

                stock:
                    Number(p.stock || 0),

                category:
                    p.categories?.name ||
                    "Others",

                store:
                    p.stores?.name ||
                    "Unknown Store",

                storeSlug:
                    p.stores?.slug ||
                    "",

                storeId:
                    p.store_id,

                image:
                    p.image_url ||
                    null

            }));


    renderProducts(
        currentCategory,
        $("searchInput")?.value || ""
    );
}


/* =========================================================
   STORE SEARCH RESULT
========================================================= */

function storeHTML(store) {

    return `
        <div
            class="store-result"
            data-store-id="${esc(store.id)}"
        >

            <div class="avatar">

                ${
                    store.logo_url
                        ? `
                            <img
                                class="avatar"
                                src="${esc(store.logo_url)}"
                                alt="${esc(store.name)}"
                            >
                        `
                        : ""
                }

            </div>


            <div class="store-result-info">

                <strong>
                    ${esc(store.name)}
                </strong>

                <span class="store-meta">
                    @${esc(store.slug)}
                </span>

            </div>


            <button
                class="view-store secondary"
                data-id="${esc(store.id)}"
                type="button"
            >
                View Store
            </button>

        </div>
    `;
}


/* =========================================================
   RENDER PRODUCTS
========================================================= */

function renderProducts(
    category = "All",
    query = ""
) {

    currentCategory =
        category;


    const q =
        String(query || "")
            .trim()
            .toLowerCase();


    const clean =
        q.replace(/^@/, "");


    const productList =
        products.filter((p) => {

            const categoryOK =
                category === "All" ||
                p.category === category;


            const text = [
                p.name,
                p.store,
                p.storeSlug,
                p.category,
                p.description
            ]
                .join(" ")
                .toLowerCase();


            const searchOK =
                !q ||
                text.includes(q) ||
                text.includes(clean);


            return (
                categoryOK &&
                searchOK
            );
        });


    const storeList =
        q
            ? stores
                .filter(
                    (s) =>
                        String(s.name)
                            .toLowerCase()
                            .includes(clean) ||
                        String(s.slug)
                            .toLowerCase()
                            .includes(clean)
                )
                .slice(0, 8)
            : [];


    const box =
        $("products");


    if (!box) return;


    if ($("productCount")) {

        $("productCount").textContent =
            `${productList.length} products`;
    }


    if (
        !productList.length &&
        !storeList.length
    ) {

        box.innerHTML = `
            <div class="empty">
                কোনো Product বা Store পাওয়া যায়নি।
            </div>
        `;

        return;
    }


    box.innerHTML =

        (
            storeList.length
                ? `
                    <div class="store-search-results">

                        <h2>
                            Stores
                        </h2>

                        ${storeList
                            .map(storeHTML)
                            .join("")}

                    </div>
                `
                : ""
        )

        +

        productList
            .map(
                (p) => `

                    <article
                        class="product-card"
                        data-id="${esc(p.id)}"
                    >

                        ${
                            p.image
                                ? `
                                    <img
                                        class="product-image"
                                        src="${esc(p.image)}"
                                        alt="${esc(p.name)}"
                                    >
                                `
                                : `
                                    <div class="product-image"></div>
                                `
                        }


                        <div class="product-info">

                            <div class="product-name">
                                ${esc(p.name)}
                            </div>

                            <div class="price">
                                ${money(p.price)}
                            </div>

                            <div class="store-name">
                                ${esc(p.store)}
                            </div>

                            <div class="stock-text">

                                ${
                                    Number(p.stock) > 0
                                        ? `Stock: ${p.stock}`
                                        : "Out of stock"
                                }

                            </div>

                        </div>

                    </article>

                `
            )
            .join("");


    box
        .querySelectorAll(".product-card")
        .forEach((card) => {

            card.onclick = () => {

                openProduct(
                    card.dataset.id
                );

            };

        });


    box
        .querySelectorAll(".view-store")
        .forEach((button) => {

            button.onclick =
                (event) => {

                    event.stopPropagation();


                    const store =
                        stores.find(
                            (s) =>
                                String(s.id) ===
                                String(
                                    button.dataset.id
                                )
                        );


                    if (!store) return;


                    if ($("searchInput")) {

                        $("searchInput").value =
                            `@${store.slug}`;
                    }


                    renderProducts(
                        "All",
                        `@${store.slug}`
                    );

                };

        });
}


/* =========================================================
   PRODUCT DETAIL
========================================================= */

function openProduct(id) {

    const product =
        products.find(
            (p) =>
                String(p.id) ===
                String(id)
        );


    if (!product) return;


    const isFollowing =
        followedStores.some(
            (store) =>
                String(store.id) ===
                String(product.storeId)
        );


    $("productDetailContent").innerHTML = `

        <button
            class="secondary"
            onclick="go('home')"
            type="button"
        >
            ← Back
        </button>


        <div class="detail">

            ${
                product.image
                    ? `
                        <img
                            src="${esc(product.image)}"
                            alt="${esc(product.name)}"
                        >
                    `
                    : ""
            }


            <div class="detail-body">

                <h1>
                    ${esc(product.name)}
                </h1>


                <h2>
                    ${money(product.price)}
                </h2>


                <p>
                    <b>Store:</b>
                    ${esc(product.store)}
                </p>


                <p>
                    <b>Stock:</b>
                    ${product.stock}
                </p>


                <p>
                    ${esc(product.description)}
                </p>


                <div class="detail-actions">

                    <button
                        class="secondary"
                        type="button"
                        onclick="toggleFollow('${esc(product.storeId)}')"
                    >
                        ${
                            isFollowing
                                ? "Unfollow Store"
                                : "Follow Store"
                        }
                    </button>


                    <button
                        class="primary"
                        type="button"

                        ${
                            Number(product.stock) <= 0
                                ? "disabled"
                                : ""
                        }

                        onclick="createOrder('${esc(product.id)}')"
                    >

                        ${
                            Number(product.stock) <= 0
                                ? "Out of Stock"
                                : "Buy / Order"
                        }

                    </button>

                </div>

            </div>

        </div>
    `;


    go("product-detail");
}


/* =========================================================
   CREATE ORDER
========================================================= */

async function createOrder(productId) {

    if (!currentUser) {

        openAuth("login");

        toast(
            "Order করতে আগে Login করো।"
        );

        return;
    }


    const product =
        products.find(
            (p) =>
                String(p.id) ===
                String(productId)
        );


    if (!product) {

        toast(
            "Product পাওয়া যায়নি।"
        );

        return;
    }


    if (
        Number(product.stock) <= 0
    ) {

        toast(
            "এই Product এখন Stock Out।"
        );

        return;
    }


    if (
        currentMyStore &&
        String(currentMyStore.id) ===
        String(product.storeId)
    ) {

        toast(
            "নিজের Product নিজে order করা যাবে না।"
        );

        return;
    }


    const quantity = 1;


    const total =
        Number(product.price) *
        quantity;


    toast(
        "Order তৈরি হচ্ছে..."
    );


    const {
        data: order,
        error: orderError
    } =
        await sb
            .from("orders")
            .insert({

                buyer_id:
                    currentUser.id,

                total_amount:
                    total,

                status:
                    "pending"

            })
            .select()
            .single();


    if (orderError) {

        console.error(
            "Order create error:",
            orderError
        );

        toast(
            orderError.message ||
            "Order তৈরি করা যায়নি।"
        );

        return;
    }


    const {
        error: itemError
    } =
        await sb
            .from("order_items")
            .insert({

                order_id:
                    order.id,

                product_id:
                    product.id,

                quantity:
                    quantity,

                price:
                    Number(product.price)

            });


    if (itemError) {

        console.error(
            "Order item error:",
            itemError
        );


        await sb
            .from("orders")
            .delete()
            .eq(
                "id",
                order.id
            );


        toast(
            itemError.message ||
            "Order item তৈরি করা যায়নি।"
        );

        return;
    }


    toast(
        "Order সফলভাবে তৈরি হয়েছে।"
    );


    await loadProducts();

    openProduct(productId);
}


/* =========================================================
   CATEGORIES
========================================================= */

async function loadCategories() {

    if (!sb) return;


    const {
        data,
        error
    } =
        await sb
            .from("categories")
            .select(
                "id,name"
            )
            .order("name");


    categories =
        error
            ? ["All"]
            : [
                "All",
                ...(data || [])
                    .map(
                        (x) => x.name
                    )
            ];


    renderCategories();

    populateCategory();
}


function renderCategories() {

    const box =
        $("categories");


    if (!box) return;


    box.innerHTML =
        categories
            .map(
                (name) => `

                    <button
                        class="category ${
                            name === currentCategory
                                ? "active"
                                : ""
                        }"
                        data-cat="${esc(name)}"
                        type="button"
                    >
                        ${esc(name)}
                    </button>

                `
            )
            .join("");


    box
        .querySelectorAll(".category")
        .forEach((button) => {

            button.onclick = () => {

                currentCategory =
                    button.dataset.cat;


                renderCategories();


                renderProducts(
                    currentCategory,
                    $("searchInput")
                        ?.value || ""
                );

            };

        });
}


function populateCategory() {

    const select =
        $("productCategory");


    if (!select) return;


    select.innerHTML =
        categories
            .filter(
                (x) => x !== "All"
            )
            .map(
                (x) =>
                    `
                        <option value="${esc(x)}">
                            ${esc(x)}
                        </option>
                    `
            )
            .join("");
}


/* =========================================================
   CREATE STORE
========================================================= */

function openStore() {

    if (!currentUser) {

        openAuth("login");

        return;
    }


    $("storeMessage").textContent = "";


    $("storeModal").classList.remove(
        "hidden"
    );
}


function closeStore() {

    $("storeModal")?.classList.add(
        "hidden"
    );
}


async function createStore(event) {

    event.preventDefault();


    if (!currentUser) {

        openAuth("login");

        return;
    }


    const name =
        $("storeName")
            .value
            .trim();


    if (!name) {

        $("storeMessage").textContent =
            "Store name দাও।";

        return;
    }


    const base =
        createSlug(name);


    const slug =
        `${base || "store"}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;


    const logoFile =
        $("storeLogoFile")
            ?.files?.[0] ||
        null;


    let logoUrl = null;


    if (logoFile) {

        $("storeMessage").textContent =
            "Store logo upload হচ্ছে...";


        logoUrl =
            await uploadImage(
                logoFile,
                "store-logos"
            );


        if (!logoUrl) {

            $("storeMessage").textContent =
                "Store logo upload করা যায়নি।";

            return;
        }
    }


    const coverFile =
        $("storeCoverFile")
            ?.files?.[0] ||
        null;


    let coverUrl = null;


    if (coverFile) {

        $("storeMessage").textContent =
            "Store cover upload হচ্ছে...";


        coverUrl =
            await uploadImage(
                coverFile,
                "store-covers"
            );


        if (!coverUrl) {

            $("storeMessage").textContent =
                "Store cover upload করা যায়নি।";

            return;
        }
    }


    const payload = {

        owner_id:
            currentUser.id,

        name:
            name,

        slug:
            slug,

        description:
            $("storeDescription")
                .value
                .trim() ||
            null,

        phone:
            $("storePhone")
                .value
                .trim() ||
            null,

        address:
            $("storeAddress")
                .value
                .trim() ||
            null,

        logo_url:
            logoUrl,

        cover_url:
            coverUrl,

        is_active:
            true,

        is_approved:
            false
    };


    $("storeMessage").textContent =
        "Store save হচ্ছে...";


    const {
        data,
        error
    } =
        await sb
            .from("stores")
            .insert(payload)
            .select()
            .single();


    if (error) {

        console.error(
            "Store insert error:",
            error
        );


        $("storeMessage").textContent =
            error.message;

        return;
    }


    currentMyStore =
        data;


    $("storeForm")?.reset();


    closeStore();


    updateAccount();

    updateAddProductNotice();


    await loadStores();

    await renderMyStore();


    toast(
        "Store created — approval pending"
    );
}


/* =========================================================
   ADD PRODUCT
========================================================= */

async function addProduct(event) {

    event.preventDefault();


    if (!currentUser) {

        openAuth("login");

        return;
    }


    if (!currentMyStore) {

        openStore();

        return;
    }


    const name =
        $("productName")
            .value
            .trim();


    if (!name) {

        $("productMsg").textContent =
            "Product name দাও।";

        return;
    }


    const price =
        Number(
            $("productPrice").value
        );


    const stock =
        Number(
            $("productStock").value
        );


    if (
        !Number.isFinite(price) ||
        price < 0
    ) {

        $("productMsg").textContent =
            "সঠিক Price দাও।";

        return;
    }


    if (
        !Number.isInteger(stock) ||
        stock < 0
    ) {

        $("productMsg").textContent =
            "সঠিক Stock দাও।";

        return;
    }


    const categoryName =
        $("productCategory").value;


    const {
        data: category,
        error: categoryError
    } =
        await sb
            .from("categories")
            .select("id")
            .eq(
                "name",
                categoryName
            )
            .maybeSingle();


    if (
        categoryError ||
        !category
    ) {

        $("productMsg").textContent =
            categoryError?.message ||
            "Category পাওয়া যায়নি।";

        return;
    }


    const imageFile =
        $("productImageFile")
            ?.files?.[0] ||
        null;


    let imageUrl = null;


    if (imageFile) {

        $("productMsg").textContent =
            "Product image upload হচ্ছে...";


        imageUrl =
            await uploadImage(
                imageFile,
                "products"
            );


        if (!imageUrl) {

            $("productMsg").textContent =
                "Product image upload করা যায়নি।";

            return;
        }
    }


    /*
       IMPORTANT:
       products.slug NOT NULL
       তাই name থেকে slug তৈরি করে
       database-এ পাঠানো হচ্ছে।
    */

    const baseSlug =
        createSlug(name);


    const slug =
        `${baseSlug || "product"}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;


    const payload = {

        name:
            name,

        slug:
            slug,

        price:
            price,

        description:
            $("productDescription")
                .value
                .trim() ||
            null,

        stock:
            stock,

        category_id:
            category.id,

        store_id:
            currentMyStore.id,

        image_url:
            imageUrl,

        is_active:
            true,

        is_approved:
            false
    };


    $("productMsg").textContent =
        "Product save হচ্ছে...";


    const {
        error
    } =
        await sb
            .from("products")
            .insert(payload);


    if (error) {

        console.error(
            "Product insert error:",
            error
        );


        $("productMsg").textContent =
            error.message;

        return;
    }


    $("productForm")?.reset();


    if ($("productStock")) {

        $("productStock").value = 1;
    }


    $("productMsg").textContent =
        "Product added — approval pending.";


    await loadProducts();

    await sellerProducts();


    toast(
        "Product added successfully"
    );
}


/* =========================================================
   FOLLOWING
========================================================= */

async function loadFollowing() {

    followedStores = [];


    if (!currentUser) return;


    const {
        data,
        error
    } =
        await sb
            .from("followed_stores")
            .select(`
                store_id,
                stores(
                    id,
                    name,
                    slug,
                    logo_url,
                    description
                )
            `)
            .eq(
                "user_id",
                currentUser.id
            );


    if (!error) {

        followedStores =
            (data || [])
                .map(
                    (x) => x.stores
                )
                .filter(Boolean);

    } else {

        console.error(
            "Following error:",
            error
        );
    }
}


async function toggleFollow(storeId) {

    if (!currentUser) {

        openAuth("login");

        toast(
            "Follow করতে আগে Login করো।"
        );

        return;
    }


    if (!storeId) return;


    const alreadyFollowing =
        followedStores.some(
            (store) =>
                String(store.id) ===
                String(storeId)
        );


    if (alreadyFollowing) {

        const {
            error
        } =
            await sb
                .from("followed_stores")
                .delete()
                .eq(
                    "user_id",
                    currentUser.id
                )
                .eq(
                    "store_id",
                    storeId
                );


        if (error) {

            toast(error.message);

            return;
        }


        await loadFollowing();


        toast(
            "Store unfollowed"
        );

    } else {

        const {
            error
        } =
            await sb
                .from("followed_stores")
                .insert({

                    user_id:
                        currentUser.id,

                    store_id:
                        storeId

                });


        if (error) {

            toast(error.message);

            return;
        }


        await loadFollowing();


        toast(
            "Store followed"
        );
    }


    if (
        location.hash ===
        "#product-detail"
    ) {

        const product =
            products.find(
                (p) =>
                    String(p.storeId) ===
                    String(storeId)
            );


        if (product) {

            openProduct(
                product.id
            );
        }
    }


    if (
        location.hash ===
        "#following"
    ) {

        renderFollowing();
    }
}


function renderFollowing() {

    const box =
        $("followingList");


    if (!box) return;


    if (!currentUser) {

        box.innerHTML = `
            <div class="empty">
                Following দেখতে Login করো।
            </div>
        `;

        return;
    }


    if (!followedStores.length) {

        box.innerHTML = `
            <div class="empty">
                এখনো কোনো Store follow করোনি।
            </div>
        `;

        return;
    }


    box.innerHTML =
        followedStores
            .map(
                (store) => `

                    <div
                        class="store-card"
                        data-store-id="${esc(store.id)}"
                    >

                        <div class="avatar">

                            ${
                                store.logo_url
                                    ? `
                                        <img
                                            class="avatar"
                                            src="${esc(store.logo_url)}"
                                            alt="${esc(store.name)}"
                                        >
                                    `
                                    : ""
                            }

                        </div>


                        <div>

                            <b>
                                ${esc(store.name)}
                            </b>

                            <br>

                            <span class="store-meta">
                                @${esc(store.slug)}
                            </span>

                        </div>


                        <button
                            class="secondary unfollow-btn"
                            type="button"
                            data-id="${esc(store.id)}"
                        >
                            Unfollow
                        </button>

                    </div>

                `
            )
            .join("");


    box
        .querySelectorAll(".store-card")
        .forEach((card) => {

            card.onclick = () => {

                const storeId =
                    card.dataset.storeId;


                const store =
                    stores.find(
                        (s) =>
                            String(s.id) ===
                            String(storeId)
                    );


                if (!store) return;


                go("home");


                if ($("searchInput")) {

                    $("searchInput").value =
                        `@${store.slug}`;
                }


                renderProducts(
                    "All",
                    `@${store.slug}`
                );
            };
        });


    box
        .querySelectorAll(".unfollow-btn")
        .forEach((button) => {

            button.onclick =
                async (event) => {

                    event.stopPropagation();

                    await toggleFollow(
                        button.dataset.id
                    );

                };
        });
}


/* =========================================================
   MY STORE
========================================================= */

async function renderMyStore() {

    updateAccount();


    const box =
        $("myStoreContent");


    const manager =
        $("storeManagerCard");


    if (!box || !manager) return;


    if (!currentUser) {

        box.innerHTML = `
            <div class="empty">
                My Store ব্যবহার করতে Login করো।
            </div>
        `;


        manager.classList.add(
            "hidden"
        );


        return;
    }


    if (!currentMyStore) {

        box.innerHTML = `
            <div class="empty">
                তোমার Store নেই। Create Store চাপো।
            </div>
        `;


        manager.classList.add(
            "hidden"
        );


        return;
    }


    const store =
        currentMyStore;


    box.innerHTML = `

        <div class="card store-profile-card">

            ${
                store.cover_url
                    ? `
                        <img
                            class="store-cover"
                            src="${esc(store.cover_url)}"
                            alt=""
                        >
                    `
                    : ""
            }


            <div class="store-profile-row">

                <div class="avatar large-avatar">

                    ${
                        store.logo_url
                            ? `
                                <img
                                    class="avatar large-avatar"
                                    src="${esc(store.logo_url)}"
                                    alt="${esc(store.name)}"
                                >
                            `
                            : ""
                    }

                </div>


                <div>

                    <h2>
                        ${esc(store.name)}
                    </h2>


                    <p>
                        @${esc(store.slug)}
                    </p>


                    <small>

                        ${
                            store.is_approved
                                ? "Approved"
                                : "Pending approval"
                        }

                    </small>

                </div>

            </div>


            <p>
                ${esc(
                    store.description ||
                    "No description"
                )}
            </p>


            ${
                store.phone
                    ? `
                        <p>
                            <b>Phone:</b>
                            ${esc(store.phone)}
                        </p>
                    `
                    : ""
            }


            ${
                store.address
                    ? `
                        <p>
                            <b>Address:</b>
                            ${esc(store.address)}
                        </p>
                    `
                    : ""
            }

        </div>

    `;


    manager.classList.remove(
        "hidden"
    );


    await sellerProducts();

    await sellerOrders();

    sellerSettings();
}


/* =========================================================
   SELLER PRODUCTS
========================================================= */

async function sellerProducts() {

    const box =
        $("sellerProductsTab");


    if (
        !box ||
        !currentMyStore
    ) {
        return;
    }


    const {
        data,
        error
    } =
        await sb
            .from("products")
            .select(`
                id,
                name,
                slug,
                price,
                stock,
                description,
                image_url,
                is_approved,
                is_active,
                category_id,
                created_at,
                categories(name)
            `)
            .eq(
                "store_id",
                currentMyStore.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        box.innerHTML = `
            <div class="empty">
                ${esc(error.message)}
            </div>
        `;

        return;
    }


    if (!data?.length) {

        box.innerHTML = `
            <div class="empty">
                কোনো product নেই।
            </div>
        `;

        return;
    }


    box.innerHTML =
        data
            .map(
                (product) => `

                    <div
                        class="manage ${
                            product.is_active
                                ? ""
                                : "inactive-product"
                        }"
                    >

                        ${
                            product.image_url
                                ? `
                                    <img
                                        src="${esc(
                                            product.image_url
                                        )}"
                                        alt="${esc(
                                            product.name
                                        )}"
                                    >
                                `
                                : `
                                    <div class="manage-placeholder"></div>
                                `
                        }


                        <div class="manage-info">

                            <b>
                                ${esc(product.name)}
                            </b>


                            <br>


                            <small>

                                ${money(product.price)}

                                · Stock
                                ${Number(
                                    product.stock || 0
                                )}

                                ·

                                ${
                                    product.is_approved
                                        ? "Approved"
                                        : "Pending"
                                }

                                ${
                                    product.is_active
                                        ? ""
                                        : " · Hidden"
                                }

                            </small>

                        </div>


                        <button
                            class="small edit"
                            data-id="${esc(product.id)}"
                            type="button"
                        >
                            Edit
                        </button>


                        <button
                            class="small del"
                            data-id="${esc(product.id)}"
                            type="button"
                        >
                            Delete
                        </button>

                    </div>

                `
            )
            .join("");


    box
        .querySelectorAll(".edit")
        .forEach((button) => {

            button.onclick = () => {

                editProduct(
                    button.dataset.id
                );

            };

        });


    box
        .querySelectorAll(".del")
        .forEach((button) => {

            button.onclick = () => {

                deleteProduct(
                    button.dataset.id
                );

            };

        });
}


/* =========================================================
   PRODUCT EDITOR
========================================================= */

function openProductEditor(product) {

    editingProductId =
        product.id;


    editingProductImageUrl =
        product.image_url ||
        null;


    $("editProductId").value =
        product.id;


    $("editProductName").value =
        product.name || "";


    $("editProductPrice").value =
        product.price ?? "";


    $("editProductStock").value =
        product.stock ?? 0;


    $("editProductDescription").value =
        product.description || "";


    const category =
        product.categories?.name ||
        "";


    $("editProductCategory").innerHTML =
        categories
            .filter(
                (x) => x !== "All"
            )
            .map(
                (x) =>
                    `
                        <option
                            value="${esc(x)}"
                            ${
                                x === category
                                    ? "selected"
                                    : ""
                            }
                        >
                            ${esc(x)}
                        </option>
                    `
            )
            .join("");


    if ($("editProductImageFile")) {

        $("editProductImageFile").value =
            "";
    }


    $("editProductMessage").textContent =
        "";


    $("productEditModal")
        .classList
        .remove("hidden");
}


function closeProductEditor() {

    editingProductId = null;

    editingProductImageUrl = null;


    $("productEditModal")
        ?.classList
        .add("hidden");
}


/* =========================================================
   LOAD PRODUCT FOR EDIT
========================================================= */

async function editProduct(id) {

    if (!currentMyStore) return;


    const {
        data,
        error
    } =
        await sb
            .from("products")
            .select(`
                *,
                categories(name)
            `)
            .eq(
                "id",
                id
            )
            .eq(
                "store_id",
                currentMyStore.id
            )
            .single();


    if (error) {

        toast(
            error.message
        );

        return;
    }


    openProductEditor(data);
}


/* =========================================================
   SAVE PRODUCT EDIT
========================================================= */

async function saveProductEdit(event) {

    event.preventDefault();


    if (
        !editingProductId ||
        !currentMyStore
    ) {
        return;
    }


    const categoryName =
        $("editProductCategory")
            .value;


    const {
        data: category,
        error: categoryError
    } =
        await sb
            .from("categories")
            .select("id")
            .eq(
                "name",
                categoryName
            )
            .maybeSingle();


    if (
        categoryError ||
        !category
    ) {

        $("editProductMessage")
            .textContent =
                categoryError?.message ||
                "Category পাওয়া যায়নি।";

        return;
    }


    const imageFile =
        $("editProductImageFile")
            ?.files?.[0] ||
        null;


    let imageUrl =
        editingProductImageUrl;


    if (imageFile) {

        $("editProductMessage")
            .textContent =
            "নতুন Product image upload হচ্ছে...";


        imageUrl =
            await uploadImage(
                imageFile,
                "products"
            );


        if (!imageUrl) {

            $("editProductMessage")
                .textContent =
                "নতুন Product image upload করা যায়নি।";

            return;
        }
    }


    const price =
        Number(
            $("editProductPrice")
                .value
        );


    const stock =
        Number(
            $("editProductStock")
                .value
        );


    if (
        !Number.isFinite(price) ||
        price < 0
    ) {

        $("editProductMessage")
            .textContent =
            "সঠিক Price দাও।";

        return;
    }


    if (
        !Number.isInteger(stock) ||
        stock < 0
    ) {

        $("editProductMessage")
            .textContent =
            "সঠিক Stock দাও।";

        return;
    }


    const name =
        $("editProductName")
            .value
            .trim();


    if (!name) {

        $("editProductMessage")
            .textContent =
            "Product name দাও।";

        return;
    }


    const updates = {

        name:
            name,

        /*
           Existing product-এর slug-ও
           name পরিবর্তন হলে update হবে।
        */

        slug:
            `${createSlug(name) || "product"}-${String(editingProductId).slice(0, 6)}`,

        price:
            price,

        stock:
            stock,

        description:
            $("editProductDescription")
                .value
                .trim() ||
            null,

        image_url:
            imageUrl,

        category_id:
            category.id
    };


    $("editProductMessage")
        .textContent =
        "Product save হচ্ছে...";


    const {
        error
    } =
        await sb
            .from("products")
            .update(updates)
            .eq(
                "id",
                editingProductId
            )
            .eq(
                "store_id",
                currentMyStore.id
            );


    if (error) {

        $("editProductMessage")
            .textContent =
            error.message;

        return;
    }


    closeProductEditor();


    await loadProducts();

    await sellerProducts();


    toast(
        "Product updated"
    );
}


/* =========================================================
   DELETE PRODUCT
========================================================= */

async function deleteProduct(id) {

    if (!currentMyStore) return;


    if (
        !confirm(
            "এই product remove করতে চাও?"
        )
    ) {
        return;
    }


    const {
        error
    } =
        await sb
            .from("products")
            .update({
                is_active: false
            })
            .eq(
                "id",
                id
            )
            .eq(
                "store_id",
                currentMyStore.id
            );


    if (error) {

        toast(
            error.message
        );

        return;
    }


    await loadProducts();

    await sellerProducts();


    toast(
        "Product removed"
    );
}


/* =========================================================
   SELLER ORDERS
========================================================= */

async function sellerOrders() {

    const box =
        $("sellerOrdersTab");


    if (
        !box ||
        !currentMyStore
    ) {
        return;
    }


    const {
        data,
        error
    } =
        await sb
            .from("order_items")
            .select(`
                id,
                order_id,
                quantity,
                price,

                products!inner(
                    id,
                    name,
                    store_id
                ),

                orders(
                    id,
                    status,
                    created_at,
                    total_amount
                )
            `)
            .eq(
                "products.store_id",
                currentMyStore.id
            );


    if (error) {

        box.innerHTML = `
            <div class="empty">
                ${esc(error.message)}
            </div>
        `;

        return;
    }


    if (!data?.length) {

        box.innerHTML = `
            <div class="empty">
                কোনো order নেই।
            </div>
        `;

        return;
    }


    const sorted =
        [...data].sort(
            (a, b) =>
                new Date(
                    b.orders?.created_at || 0
                ) -
                new Date(
                    a.orders?.created_at || 0
                )
        );


    box.innerHTML =
        sorted
            .map(
                (item) => `

                    <div class="card">

                        <b>
                            Order #${esc(
                                item.order_id
                            )}
                        </b>


                        <p>

                            ${esc(
                                item.products?.name ||
                                "Product"
                            )}

                            ×

                            ${Number(
                                item.quantity || 0
                            )}

                        </p>


                        <p>

                            Price:

                            ${money(
                                Number(item.price || 0) *
                                Number(item.quantity || 0)
                            )}

                        </p>


                        <small>

                            Status:

                            ${esc(
                                item.orders?.status ||
                                "pending"
                            )}

                        </small>

                    </div>

                `
            )
            .join("");
}


/* =========================================================
   STORE SETTINGS
========================================================= */

function sellerSettings() {

    const box =
        $("sellerSettingsTab");


    if (
        !box ||
        !currentMyStore
    ) {
        return;
    }


    const store =
        currentMyStore;


    box.innerHTML = `

        <div class="card">

            <label>

                Store name

                <input
                    id="setName"
                    value="${esc(store.name)}"
                >

            </label>


            <label>

                Description

                <textarea
                    id="setDesc"
                >${esc(
                    store.description || ""
                )}</textarea>

            </label>


            <label>

                Phone

                <input
                    id="setPhone"
                    value="${esc(
                        store.phone || ""
                    )}"
                >

            </label>


            <label>

                Address

                <input
                    id="setAddress"
                    value="${esc(
                        store.address || ""
                    )}"
                >

            </label>


            <label>

                Store Logo

                <input
                    id="setLogoFile"
                    type="file"
                    accept="image/*"
                >

            </label>


            ${
                store.logo_url
                    ? `
                        <small class="store-meta">
                            বর্তমান Logo আছে। নতুন File না দিলে আগের Logo থাকবে।
                        </small>
                    `
                    : ""
            }


            <label>

                Store Cover

                <input
                    id="setCoverFile"
                    type="file"
                    accept="image/*"
                >

            </label>


            ${
                store.cover_url
                    ? `
                        <small class="store-meta">
                            বর্তমান Cover আছে। নতুন File না দিলে আগের Cover থাকবে।
                        </small>
                    `
                    : ""
            }


            <button
                id="saveStore"
                class="primary"
                type="button"
            >
                Save Store
            </button>


            <p id="storeSettingsMessage"></p>

        </div>

    `;


    $("saveStore").onclick =
        saveStoreSettings;
}


/* =========================================================
   SAVE STORE SETTINGS
========================================================= */

async function saveStoreSettings() {

    if (
        !currentUser ||
        !currentMyStore
    ) {
        return;
    }


    const message =
        $("storeSettingsMessage");


    const name =
        $("setName")
            .value
            .trim();


    if (!name) {

        message.textContent =
            "Store name দাও।";

        return;
    }


    let logoUrl =
        currentMyStore.logo_url ||
        null;


    let coverUrl =
        currentMyStore.cover_url ||
        null;


    const logoFile =
        $("setLogoFile")
            ?.files?.[0] ||
        null;


    if (logoFile) {

        message.textContent =
            "নতুন Logo upload হচ্ছে...";


        logoUrl =
            await uploadImage(
                logoFile,
                "store-logos"
            );


        if (!logoUrl) {

            message.textContent =
                "Logo upload করা যায়নি।";

            return;
        }
    }


    const coverFile =
        $("setCoverFile")
            ?.files?.[0] ||
        null;


    if (coverFile) {

        message.textContent =
            "নতুন Cover upload হচ্ছে...";


        coverUrl =
            await uploadImage(
                coverFile,
                "store-covers"
            );


        if (!coverUrl) {

            message.textContent =
                "Cover upload করা যায়নি।";

            return;
        }
    }


    const updates = {

        name,

        description:
            $("setDesc")
                .value
                .trim() ||
            null,

        phone:
            $("setPhone")
                .value
                .trim() ||
            null,

        address:
            $("setAddress")
                .value
                .trim() ||
            null,

        logo_url:
            logoUrl,

        cover_url:
            coverUrl
    };


    message.textContent =
        "Store save হচ্ছে...";


    const {
        data,
        error
    } =
        await sb
            .from("stores")
            .update(updates)
            .eq(
                "id",
                currentMyStore.id
            )
            .eq(
                "owner_id",
                currentUser.id
            )
            .select()
            .single();


    if (error) {

        console.error(
            "Store update error:",
            error
        );


        message.textContent =
            error.message;

        return;
    }


    currentMyStore =
        data;


    await loadStores();

    await renderMyStore();


    updateAddProductNotice();


    toast(
        "Store updated"
    );
}


/* =========================================================
   UI EVENTS
========================================================= */

function init() {


    /* -----------------------------
       Navigation
    ----------------------------- */

    document
        .querySelectorAll(
            "[data-route]"
        )
        .forEach((el) => {

            el.onclick = () => {

                go(
                    el.dataset.route
                );

            };

        });


    /* -----------------------------
       Menu
    ----------------------------- */

    $("menuBtn")
        ?.addEventListener(
            "click",
            openMenu
        );


    $("closeMenuBtn")
        ?.addEventListener(
            "click",
            closeMenu
        );


    $("menuOverlay")
        ?.addEventListener(
            "click",
            closeMenu
        );


    /* -----------------------------
       Account
    ----------------------------- */

    $("loginBtn")
        ?.addEventListener(
            "click",
            () =>
                openAuth("login")
        );


    $("logoutBtn")
        ?.addEventListener(
            "click",
            logout
        );


    $("createStoreBtn")
        ?.addEventListener(
            "click",
            openStore
        );


    /* -----------------------------
       Auth
    ----------------------------- */

    $("closeAuthBtn")
        ?.addEventListener(
            "click",
            closeAuth
        );


    $("authSwitchBtn")
        ?.addEventListener(
            "click",
            () =>
                openAuth(
                    authMode === "login"
                        ? "register"
                        : "login"
                )
        );


    $("authForm")
        ?.addEventListener(
            "submit",
            authSubmit
        );


    /* -----------------------------
       Store
    ----------------------------- */

    $("closeStoreBtn")
        ?.addEventListener(
            "click",
            closeStore
        );


    $("storeForm")
        ?.addEventListener(
            "submit",
            createStore
        );


    /* -----------------------------
       Product
    ----------------------------- */

    $("productForm")
        ?.addEventListener(
            "submit",
            addProduct
        );


    $("closeProductEditBtn")
        ?.addEventListener(
            "click",
            closeProductEditor
        );


    $("productEditForm")
        ?.addEventListener(
            "submit",
            saveProductEdit
        );


    /* -----------------------------
       Search
    ----------------------------- */

    $("searchInput")
        ?.addEventListener(
            "input",
            () => {

                renderProducts(
                    currentCategory,
                    $("searchInput")
                        .value || ""
                );

            }
        );


    $("searchBtn")
        ?.addEventListener(
            "click",
            () => {

                go("home");

                renderProducts(
                    currentCategory,
                    $("searchInput")
                        .value || ""
                );

            }
        );


    $("headerSearchBtn")
        ?.addEventListener(
            "click",
            () => {

                go("home");


                setTimeout(
                    () =>
                        $("searchInput")
                            ?.focus(),
                    50
                );

            }
        );


    /* -----------------------------
       Seller Tabs
    ----------------------------- */

    document
        .querySelectorAll(".tab")
        .forEach((tab) => {

            tab.onclick = () => {

                document
                    .querySelectorAll(".tab")
                    .forEach((t) =>
                        t.classList.remove(
                            "active"
                        )
                    );


                tab.classList.add(
                    "active"
                );


                const tabName =
                    tab.dataset.tab;


                $("sellerProductsTab")
                    ?.classList.toggle(
                        "hidden",
                        tabName !==
                        "products"
                    );


                $("sellerOrdersTab")
                    ?.classList.toggle(
                        "hidden",
                        tabName !==
                        "orders"
                    );


                $("sellerSettingsTab")
                    ?.classList.toggle(
                        "hidden",
                        tabName !==
                        "settings"
                    );

            };

        });


    /* -----------------------------
       Modal shades
    ----------------------------- */

    $("authModal")
        ?.querySelector(".shade")
        ?.addEventListener(
            "click",
            closeAuth
        );


    $("storeModal")
        ?.querySelector(".shade")
        ?.addEventListener(
            "click",
            closeStore
        );


    $("productEditModal")
        ?.querySelector(".shade")
        ?.addEventListener(
            "click",
            closeProductEditor
        );


    /* -----------------------------
       Initial render
    ----------------------------- */

    renderCategories();

    renderProducts();

    route();


    /* -----------------------------
       Load Supabase data
    ----------------------------- */

    (async () => {

        await updateAuth();

        await loadCategories();

        await loadStores();

        await loadProducts();

        route();

    })();
}


/* =========================================================
   AUTH STATE
========================================================= */

if (sb?.auth) {

    sb.auth.onAuthStateChange(
        async () => {

            await updateAuth();


            if (
                location.hash ===
                "#my-store"
            ) {

                await renderMyStore();

            }

        }
    );
}


/* =========================================================
   START APP
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);


/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.go =
    go;

window.toast =
    toast;

window.closeMenu =
    closeMenu;

window.closeAuth =
    closeAuth;

window.closeStore =
    closeStore;

window.closeProductEditor =
    closeProductEditor;

window.createOrder =
    createOrder;

window.toggleFollow =
    toggleFollow;
