/* =========================================================
   BUYHAAT ADMIN PANEL
   Login → Dashboard
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
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
};


const money = (value) => {

    const number = Number(value || 0);

    return `৳${number.toLocaleString("en-BD")}`;
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


const shortId = (value) => {

    if (!value) {
        return "—";
    }

    return String(value).slice(0, 8);
};


/* =========================================================
   ELEMENTS
========================================================= */

const adminLogin = $("adminLogin");
const adminApp = $("adminApp");

const adminLoginForm = $("adminLoginForm");
const adminEmail = $("adminEmail");
const adminPassword = $("adminPassword");
const adminLoginBtn = $("adminLoginBtn");
const loginMessage = $("loginMessage");

const logoutBtn = $("logoutBtn");

const sidebarToggle = $("sidebarToggle");
const adminSidebar = $("adminSidebar");


/* =========================================================
   INITIAL STATE
   Login page visible
   Admin app hidden
========================================================= */

function showLogin() {

    adminLogin.style.display = "flex";

    adminApp.style.display = "none";

    document.body.classList.remove("logged-in");

}


function showAdminApp() {

    adminLogin.style.display = "none";

    adminApp.style.display = "block";

    document.body.classList.add("logged-in");

}


/* =========================================================
   TOAST
========================================================= */

function showToast(message, type = "success") {

    const toast = $("toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;

    toast.className = `toast ${type}`;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);
}


/* =========================================================
   LOGIN
========================================================= */

adminLoginForm?.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const email = adminEmail.value.trim();

        const password = adminPassword.value;

        if (!email || !password) {

            loginMessage.textContent =
                "Email এবং Password দিন।";

            return;
        }


        adminLoginBtn.disabled = true;

        adminLoginBtn.textContent = "Logging in...";

        loginMessage.textContent = "";


        const { data, error } =
            await sb.auth.signInWithPassword({
                email,
                password
            });


        if (error) {

            loginMessage.textContent =
                error.message ||
                "Login failed.";

            adminLoginBtn.disabled = false;

            adminLoginBtn.textContent = "Login";

            return;
        }


        if (!data?.session) {

            loginMessage.textContent =
                "Login session তৈরি হয়নি।";

            adminLoginBtn.disabled = false;

            adminLoginBtn.textContent = "Login";

            return;
        }


        loginMessage.textContent = "";

        adminLoginBtn.disabled = false;

        adminLoginBtn.textContent = "Login";


        showAdminApp();

        await initializeAdmin();

    }
);


/* =========================================================
   LOGOUT
========================================================= */

logoutBtn?.addEventListener(
    "click",
    async () => {

        await sb.auth.signOut();

        showLogin();

    }
);


/* =========================================================
   SESSION CHECK
========================================================= */

async function checkSession() {

    /*
       খুব গুরুত্বপূর্ণ:
       শুরুতেই Admin App hidden থাকবে।
    */

    showLogin();


    const {
        data,
        error
    } = await sb.auth.getSession();


    if (error) {

        console.error(
            "Session error:",
            error
        );

        showLogin();

        return;
    }


    const session = data?.session;


    if (!session) {

        /*
           User login করা নেই
           তাই Login Page-এই থাকবে
        */

        showLogin();

        return;
    }


    /*
       User আগে থেকেই login করা আছে।
       তাই Dashboard দেখানো যাবে।
    */

    showAdminApp();

    await initializeAdmin();

}


/* =========================================================
   AUTH STATE
========================================================= */

sb.auth.onAuthStateChange(
    async (event, session) => {

        if (event === "SIGNED_OUT") {

            showLogin();

            return;
        }


        if (
            event === "SIGNED_IN" &&
            session
        ) {

            showAdminApp();

        }

    }
);


/* =========================================================
   ADMIN INITIALIZE
========================================================= */

let adminInitialized = false;


async function initializeAdmin() {

    if (adminInitialized) {
        return;
    }

    adminInitialized = true;


    const {
        data
    } = await sb.auth.getUser();


    if (data?.user) {

        const emailDisplay =
            $("adminEmailDisplay");

        if (emailDisplay) {

            emailDisplay.textContent =
                data.user.email || "—";

        }

    }


    setupNavigation();

    setupSidebar();

    setupRefreshButtons();

    await loadDashboard();

    await checkSupabase();

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    const pages =
        document.querySelectorAll(
            ".admin-page-section"
        );


    navItems.forEach((item) => {

        item.addEventListener(
            "click",
            async () => {

                const page =
                    item.dataset.page;


                navItems.forEach(
                    (nav) => {

                        nav.classList.remove(
                            "active"
                        );

                    }
                );


                item.classList.add(
                    "active"
                );


                pages.forEach(
                    (section) => {

                        section.classList.remove(
                            "active"
                        );

                    }
                );


                const target =
                    document.getElementById(
                        `page-${page}`
                    );


                if (target) {

                    target.classList.add(
                        "active"
                    );

                }


                if (page === "dashboard") {

                    await loadDashboard();

                }


                if (page === "stores") {

                    await loadStores();

                }


                if (page === "products") {

                    await loadProducts();

                }


                if (page === "orders") {

                    await loadOrders();

                }


                if (window.innerWidth <= 900) {

                    adminSidebar?.classList.remove(
                        "open"
                    );

                }

            }
        );

    });

}


/* =========================================================
   SIDEBAR
========================================================= */

function setupSidebar() {

    sidebarToggle?.addEventListener(
        "click",
        () => {

            adminSidebar?.classList.toggle(
                "open"
            );

        }
    );

}


/* =========================================================
   REFRESH BUTTONS
========================================================= */

function setupRefreshButtons() {

    $("refreshStoresBtn")?.addEventListener(
        "click",
        loadStores
    );


    $("refreshProductsBtn")?.addEventListener(
        "click",
        loadProducts
    );


    $("refreshOrdersBtn")?.addEventListener(
        "click",
        loadOrders
    );

}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

    await Promise.all([
        loadStats(),
        loadRecentOrders(),
        loadRecentStores()
    ]);

}


/* =========================================================
   STATS
========================================================= */

async function loadStats() {

    try {

        const [
            stores,
            products,
            orders
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
            stores.count ?? 0;

        $("totalProducts").textContent =
            products.count ?? 0;

        $("totalOrders").textContent =
            orders.count ?? 0;

        /*
           Supabase Auth users client-side
           থেকে নিরাপদভাবে count করা যায় না।
        */

        $("totalUsers").textContent = "—";


    } catch (error) {

        console.error(
            "Stats error:",
            error
        );

    }

}


/* =========================================================
   RECENT STORES
========================================================= */

async function loadRecentStores() {

    const container =
        $("recentStores");


    if (!container) {
        return;
    }


    container.innerHTML =
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
        )
        .limit(5);


    if (error) {

        container.innerHTML =
            `<div class="empty-state">
                ${esc(error.message)}
            </div>`;

        return;
    }


    if (!data?.length) {

        container.innerHTML =
            `<div class="empty-state">
                কোনো Store নেই।
            </div>`;

        return;
    }


    container.innerHTML = `

        <div class="simple-list">

            ${data.map(store => `

                <div class="simple-list-item">

                    <div>

                        <strong>
                            ${esc(
                                store.name ||
                                store.store_name ||
                                "Unnamed Store"
                            )}
                        </strong>

                        <small>
                            ${dateText(
                                store.created_at
                            )}
                        </small>

                    </div>

                    <span>
                        ${esc(
                            store.slug || ""
                        )}
                    </span>

                </div>

            `).join("")}

        </div>

    `;

}


/* =========================================================
   RECENT ORDERS
========================================================= */

async function loadRecentOrders() {

    const container =
        $("recentOrders");


    if (!container) {
        return;
    }


    container.innerHTML =
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
        )
        .limit(5);


    if (error) {

        container.innerHTML =
            `<div class="empty-state">
                ${esc(error.message)}
            </div>`;

        return;
    }


    if (!data?.length) {

        container.innerHTML =
            `<div class="empty-state">
                কোনো Order নেই।
            </div>`;

        return;
    }


    container.innerHTML = `

        <div class="simple-list">

            ${data.map(order => `

                <div class="simple-list-item">

                    <div>

                        <strong>
                            Order #${shortId(
                                order.id
                            )}
                        </strong>

                        <small>
                            ${dateText(
                                order.created_at
                            )}
                        </small>

                    </div>

                    <strong>
                        ${money(
                            order.total ||
                            order.subtotal ||
                            0
                        )}
                    </strong>

                </div>

            `).join("")}

        </div>

    `;

}


/* =========================================================
   STORES
========================================================= */

async function loadStores() {

    const container =
        $("storesTable");


    if (!container) {
        return;
    }


    container.innerHTML =
        `<div class="loading">Loading stores...</div>`;


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

        container.innerHTML =
            `<div class="empty-state">
                ${esc(error.message)}
            </div>`;

        return;
    }


    if (!data?.length) {

        container.innerHTML =
            `<div class="empty-state">
                কোনো Store পাওয়া যায়নি।
            </div>`;

        return;
    }


    container.innerHTML = `

        <div class="table-scroll">

            <table>

                <thead>

                    <tr>
                        <th>Store</th>
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
                                        store.store_name ||
                                        "Unnamed"
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${esc(
                                    store.slug || "—"
                                )}
                            </td>

                            <td>
                                ${dateText(
                                    store.created_at
                                )}
                            </td>

                            <td>

                                <button
                                    class="danger-btn"
                                    data-delete-store="${esc(
                                        store.id
                                    )}"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;


    container
        .querySelectorAll(
            "[data-delete-store]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const id =
                        button.dataset.deleteStore;


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

                        showToast(
                            error.message,
                            "error"
                        );

                        return;
                    }


                    showToast(
                        "Store deleted successfully."
                    );


                    await loadStores();

                    await loadStats();

                }
            );

        });

}


/* =========================================================
   PRODUCTS
========================================================= */

async function loadProducts() {

    const container =
        $("productsTable");


    if (!container) {
        return;
    }


    container.innerHTML =
        `<div class="loading">Loading products...</div>`;


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

        container.innerHTML =
            `<div class="empty-state">
                ${esc(error.message)}
            </div>`;

        return;
    }


    if (!data?.length) {

        container.innerHTML =
            `<div class="empty-state">
                কোনো Product পাওয়া যায়নি।
            </div>`;

        return;
    }


    container.innerHTML = `

        <div class="table-scroll">

            <table>

                <thead>

                    <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Stock</th>
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
                                        "Unnamed Product"
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
                                    product.stock ?? 0
                                )}
                            </td>

                            <td>
                                ${dateText(
                                    product.created_at
                                )}
                            </td>

                            <td>

                                <button
                                    class="danger-btn"
                                    data-delete-product="${esc(
                                        product.id
                                    )}"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;


    container
        .querySelectorAll(
            "[data-delete-product]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const id =
                        button.dataset.deleteProduct;


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

                        showToast(
                            error.message,
                            "error"
                        );

                        return;
                    }


                    showToast(
                        "Product deleted successfully."
                    );


                    await loadProducts();

                    await loadStats();

                }
            );

        });

}


/* =========================================================
   ORDERS
========================================================= */

async function loadOrders() {

    const container =
        $("ordersTable");


    if (!container) {
        return;
    }


    container.innerHTML =
        `<div class="loading">Loading orders...</div>`;


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

        container.innerHTML =
            `<div class="empty-state">
                ${esc(error.message)}
            </div>`;

        return;
    }


    if (!data?.length) {

        container.innerHTML =
            `<div class="empty-state">
                কোনো Order পাওয়া যায়নি।
            </div>`;

        return;
    }


    container.innerHTML = `

        <div class="table-scroll">

            <table>

                <thead>

                    <tr>
                        <th>Order ID</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Action</th>
                    </tr>

                </thead>

                <tbody>

                    ${data.map(order => `

                        <tr>

                            <td>
                                <strong>
                                    #${shortId(
                                        order.id
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${money(
                                    order.total ||
                                    order.subtotal ||
                                    0
                                )}
                            </td>

                            <td>

                                <span class="status-badge">
                                    ${esc(
                                        order.status ||
                                        "pending"
                                    )}
                                </span>

                            </td>

                            <td>
                                ${dateText(
                                    order.created_at
                                )}
                            </td>

                            <td>

                                <button
                                    class="action-btn small"
                                    data-view-order="${esc(
                                        order.id
                                    )}"
                                >
                                    View
                                </button>

                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;


    container
        .querySelectorAll(
            "[data-view-order]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const id =
                        button.dataset.viewOrder;


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
                            error.message,
                            "error"
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
            );

        });

}


/* =========================================================
   SUPABASE STATUS
========================================================= */

async function checkSupabase() {

    const element =
        $("supabaseStatus");


    if (!element) {
        return;
    }


    const {
        error
    } = await sb
        .from("stores")
        .select("id")
        .limit(1);


    if (error) {

        element.textContent =
            "Connection Error";

        element.style.color =
            "#dc2626";

        return;
    }


    element.textContent =
        "Connected";

    element.style.color =
        "#16a34a";

}


/* =========================================================
   START
========================================================= */

checkSession();
