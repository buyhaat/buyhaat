/* =========================================================
   BUYHAAT ADMIN PANEL
   Login + Dashboard + Stores + Products + Orders
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================================
   HELPERS
========================================================= */

const $ = (id) => document.getElementById(id);

const esc = (value) => {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};


const money = (value) => {

    const number = Number(value || 0);

    return "৳" + number.toLocaleString("en-BD");
};


const dateText = (value) => {

    if (!value) {
        return "—";
    }

    try {

        return new Date(value).toLocaleString(
            "en-BD",
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        );

    } catch {

        return value;
    }
};


function showToast(message) {

    const toast = $("toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(window.__toastTimer);

    window.__toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);
}


/* =========================================================
   STATE
========================================================= */

let currentUser = null;
let currentPage = "dashboard";


/* =========================================================
   LOGIN
========================================================= */

$("adminLoginForm").addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const email = $("adminEmail").value.trim();
        const password = $("adminPassword").value;

        const button = $("adminLoginBtn");
        const message = $("loginMessage");

        button.disabled = true;
        button.textContent = "Logging in...";

        message.textContent = "";

        try {

            const { data, error } =
                await sb.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) {
                throw error;
            }

            currentUser = data.user;

            await startAdmin();

        } catch (error) {

            console.error(error);

            message.textContent =
                error.message ||
                "Login failed.";

        } finally {

            button.disabled = false;
            button.textContent = "Login";

        }

    }
);


/* =========================================================
   LOGOUT
========================================================= */

$("logoutBtn").addEventListener(
    "click",
    async () => {

        await sb.auth.signOut();

        currentUser = null;

        $("adminApp").classList.add("hidden");
        $("adminLogin").classList.remove("hidden");

        $("adminPassword").value = "";

    }
);


/* =========================================================
   SESSION CHECK
========================================================= */

async function checkSession() {

    const {
        data: {
            session
        }
    } = await sb.auth.getSession();

    if (session?.user) {

        currentUser = session.user;

        await startAdmin();

    } else {

        showLogin();

    }
}


function showLogin() {

    $("adminApp").classList.add("hidden");
    $("adminLogin").classList.remove("hidden");

}


/* =========================================================
   START ADMIN
========================================================= */

async function startAdmin() {

    $("adminLogin").classList.add("hidden");
    $("adminApp").classList.remove("hidden");

    $("adminEmailDisplay").textContent =
        currentUser?.email || "—";

    $("supabaseStatus").textContent =
        "Connected";

    await loadDashboard();

}


/* =========================================================
   NAVIGATION
========================================================= */

document.querySelectorAll(
    ".nav-item"
).forEach((button) => {

    button.addEventListener(
        "click",
        () => {

            const page =
                button.dataset.page;

            openPage(page);

            if (
                window.innerWidth <= 850
            ) {

                $("adminSidebar")
                    .classList.remove("open");

            }

        }
    );

});


document.querySelectorAll(
    "[data-page]"
).forEach((button) => {

    if (
        button.classList.contains("nav-item")
    ) {
        return;
    }

    button.addEventListener(
        "click",
        () => {

            openPage(
                button.dataset.page
            );

        }
    );

});


function openPage(page) {

    currentPage = page;

    document.querySelectorAll(
        ".admin-page"
    ).forEach((section) => {

        section.classList.add("hidden");

    });


    const target =
        $("page-" + page);

    if (target) {
        target.classList.remove("hidden");
    }


    document.querySelectorAll(
        ".nav-item"
    ).forEach((button) => {

        button.classList.toggle(
            "active",
            button.dataset.page === page
        );

    });


    if (page === "dashboard") {
        loadDashboard();
    }

    if (page === "stores") {
        loadStores();
    }

    if (page === "products") {
        loadProducts();
    }

    if (page === "orders") {
        loadOrders();
    }

}


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

$("sidebarToggle").addEventListener(
    "click",
    () => {

        $("adminSidebar")
            .classList.toggle("open");

    }
);


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        const [
            storesResult,
            productsResult,
            ordersResult
        ] = await Promise.all([

            sb
                .from("stores")
                .select("*", {
                    count: "exact",
                    head: true
                }),

            sb
                .from("products")
                .select("*", {
                    count: "exact",
                    head: true
                }),

            sb
                .from("orders")
                .select("*", {
                    count: "exact",
                    head: true
                })

        ]);


        $("totalStores").textContent =
            storesResult.count || 0;

        $("totalProducts").textContent =
            productsResult.count || 0;

        $("totalOrders").textContent =
            ordersResult.count || 0;


        /*
         * Supabase Auth users সরাসরি client-side
         * থেকে পড়া যায় না।
         * তাই এখন 0 রাখা হয়েছে।
         * পরবর্তী ধাপে secure admin function দিয়ে
         * এটি যুক্ত করা হবে।
         */

        $("totalUsers").textContent = "—";


        await loadRecentStores();
        await loadRecentOrders();

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

        showToast(
            error.message ||
            "Dashboard load failed"
        );

    }

}


/* =========================================================
   RECENT STORES
========================================================= */

async function loadRecentStores() {

    const box =
        $("recentStores");

    const {
        data,
        error
    } = await sb
        .from("stores")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        )
        .limit(5);


    if (error) {

        console.error(error);

        box.innerHTML = `
            <div class="empty-state">
                Store load করা যায়নি।
            </div>
        `;

        return;
    }


    if (!data?.length) {

        box.innerHTML = `
            <div class="empty-state">
                কোনো Store পাওয়া যায়নি।
            </div>
        `;

        return;
    }


    box.innerHTML = `

        <table class="admin-table">

            <thead>

                <tr>
                    <th>Store</th>
                    <th>Slug</th>
                    <th>Created</th>
                </tr>

            </thead>

            <tbody>

                ${data.map(store => `

                    <tr>

                        <td>
                            <strong>
                                ${esc(store.name || "Unnamed")}
                            </strong>
                        </td>

                        <td>
                            ${esc(store.slug || "—")}
                        </td>

                        <td>
                            ${dateText(store.created_at)}
                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>
    `;

}


/* =========================================================
   RECENT ORDERS
========================================================= */

async function loadRecentOrders() {

    const box =
        $("recentOrders");

    const {
        data,
        error
    } = await sb
        .from("orders")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        )
        .limit(5);


    if (error) {

        console.error(error);

        box.innerHTML = `
            <div class="empty-state">
                Order load করা যায়নি।
            </div>
        `;

        return;
    }


    if (!data?.length) {

        box.innerHTML = `
            <div class="empty-state">
                কোনো Order পাওয়া যায়নি।
            </div>
        `;

        return;
    }


    box.innerHTML = `

        <table class="admin-table">

            <thead>

                <tr>
                    <th>Order ID</th>
                    <th>Total</th>
                    <th>Created</th>
                </tr>

            </thead>

            <tbody>

                ${data.map(order => `

                    <tr>

                        <td>
                            ${esc(
                                String(order.id)
                                    .slice(0, 8)
                            )}
                        </td>

                        <td>
                            ${money(
                                order.total_amount
                            )}
                        </td>

                        <td>
                            ${dateText(
                                order.created_at
                            )}
                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>
    `;

}


/* =========================================================
   STORES
========================================================= */

async function loadStores() {

    const box =
        $("storesTable");

    box.innerHTML =
        `<div class="loading">Loading...</div>`;


    const {
        data,
        error
    } = await sb
        .from("stores")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        box.innerHTML = `
            <div class="empty-state">
                ${esc(error.message)}
            </div>
        `;

        return;
    }


    if (!data?.length) {

        box.innerHTML = `
            <div class="empty-state">
                কোনো Store পাওয়া যায়নি।
            </div>
        `;

        return;
    }


    box.innerHTML = `

        <table class="admin-table">

            <thead>

                <tr>
                    <th>Store</th>
                    <th>Owner</th>
                    <th>Slug</th>
                    <th>Created</th>
                    <th>Action</th>
                </tr>

            </thead>

            <tbody>

                ${data.map(store => `

                    <tr>

                        <td>

                            <strong>
                                ${esc(
                                    store.name ||
                                    "Unnamed"
                                )}
                            </strong>

                        </td>

                        <td>
                            ${esc(
                                store.owner_id ||
                                store.user_id ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${esc(
                                store.slug ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${dateText(
                                store.created_at
                            )}
                        </td>

                        <td>

                            <button
                                class="action-btn danger"
                                onclick="deleteStore('${esc(store.id)}')"
                            >
                                Delete
                            </button>

                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>
    `;

}


/* =========================================================
   DELETE STORE
========================================================= */

async function deleteStore(id) {

    const ok =
        confirm(
            "এই Store delete করতে চান?"
        );

    if (!ok) {
        return;
    }


    const {
        error
    } = await sb
        .from("stores")
        .delete()
        .eq("id", id);


    if (error) {

        console.error(error);

        showToast(
            error.message ||
            "Store delete করা যায়নি"
        );

        return;
    }


    showToast(
        "Store deleted"
    );

    await loadStores();
    await loadDashboard();

}


/* =========================================================
   PRODUCTS
========================================================= */

async function loadProducts() {

    const box =
        $("productsTable");

    box.innerHTML =
        `<div class="loading">Loading...</div>`;


    const {
        data,
        error
    } = await sb
        .from("products")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        box.innerHTML = `
            <div class="empty-state">
                ${esc(error.message)}
            </div>
        `;

        return;
    }


    if (!data?.length) {

        box.innerHTML = `
            <div class="empty-state">
                কোনো Product পাওয়া যায়নি।
            </div>
        `;

        return;
    }


    box.innerHTML = `

        <table class="admin-table">

            <thead>

                <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Store</th>
                    <th>Created</th>
                    <th>Action</th>
                </tr>

            </thead>

            <tbody>

                ${data.map(product => `

                    <tr>

                        <td>
                            <strong>
                                ${esc(
                                    product.name ||
                                    "Unnamed"
                                )}
                            </strong>
                        </td>

                        <td>
                            ${money(
                                product.price
                            )}
                        </td>

                        <td>
                            ${esc(
                                product.stock ??
                                "—"
                            )}
                        </td>

                        <td>
                            ${esc(
                                product.store_id ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${dateText(
                                product.created_at
                            )}
                        </td>

                        <td>

                            <button
                                class="action-btn danger"
                                onclick="deleteProduct('${esc(product.id)}')"
                            >
                                Delete
                            </button>

                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>
    `;

}


/* =========================================================
   DELETE PRODUCT
========================================================= */

async function deleteProduct(id) {

    const ok =
        confirm(
            "এই Product delete করতে চান?"
        );

    if (!ok) {
        return;
    }


    const {
        error
    } = await sb
        .from("products")
        .delete()
        .eq("id", id);


    if (error) {

        console.error(error);

        showToast(
            error.message ||
            "Product delete করা যায়নি"
        );

        return;
    }


    showToast(
        "Product deleted"
    );

    await loadProducts();
    await loadDashboard();

}


/* =========================================================
   ORDERS
========================================================= */

async function loadOrders() {

    const box =
        $("ordersTable");

    box.innerHTML =
        `<div class="loading">Loading...</div>`;


    const {
        data,
        error
    } = await sb
        .from("orders")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        box.innerHTML = `
            <div class="empty-state">
                ${esc(error.message)}
            </div>
        `;

        return;
    }


    if (!data?.length) {

        box.innerHTML = `
            <div class="empty-state">
                কোনো Order পাওয়া যায়নি।
            </div>
        `;

        return;
    }


    box.innerHTML = `

        <table class="admin-table">

            <thead>

                <tr>
                    <th>Order ID</th>
                    <th>Total</th>
                    <th>Created</th>
                    <th>Action</th>
                </tr>

            </thead>

            <tbody>

                ${data.map(order => `

                    <tr>

                        <td>
                            <strong>
                                ${esc(
                                    String(order.id)
                                        .slice(0, 12)
                                )}
                            </strong>
                        </td>

                        <td>
                            ${money(
                                order.total_amount
                            )}
                        </td>

                        <td>
                            ${dateText(
                                order.created_at
                            )}
                        </td>

                        <td>

                            <button
                                class="action-btn"
                                onclick="viewOrder('${esc(order.id)}')"
                            >
                                View
                            </button>

                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>
    `;

}


/* =========================================================
   VIEW ORDER
========================================================= */

async function viewOrder(id) {

    const {
        data,
        error
    } = await sb
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();


    if (error) {

        showToast(
            error.message ||
            "Order পাওয়া যায়নি"
        );

        return;
    }


    alert(
        JSON.stringify(
            data,
            null,
            2
        )
    );

}


/* =========================================================
   REFRESH BUTTONS
========================================================= */

$("refreshStoresBtn").addEventListener(
    "click",
    loadStores
);

$("refreshProductsBtn").addEventListener(
    "click",
    loadProducts
);

$("refreshOrdersBtn").addEventListener(
    "click",
    loadOrders
);

$("refreshUsersBtn").addEventListener(
    "click",
    () => {

        showToast(
            "User management পরবর্তী ধাপে যুক্ত হবে"
        );

    }
);


/* =========================================================
   AUTH STATE
========================================================= */

sb.auth.onAuthStateChange(
    async (event, session) => {

        if (
            event === "SIGNED_OUT"
        ) {

            currentUser = null;

            showLogin();

        }

    }
);


/* =========================================================
   START
========================================================= */

checkSession();
