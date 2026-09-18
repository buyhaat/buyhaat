alert("ADMIN JS LOADED");

/* =========================================================
   BUYHAAT ADMIN PANEL
   Login + Dashboard + Stores + Products + Orders
   + Users + Settings + Logout
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

if (
    typeof window.supabase === "undefined" ||
    typeof SUPABASE_URL === "undefined" ||
    typeof SUPABASE_ANON_KEY === "undefined"
) {
    document.body.innerHTML = `
        <div style="
            padding:30px;
            font-family:system-ui,sans-serif;
            color:#b91c1c;
        ">
            <h2>Admin Panel Error</h2>
            <p>Supabase configuration পাওয়া যায়নি।</p>
            <p>supabase-config.js ঠিকভাবে load হয়েছে কিনা দেখুন।</p>
        </div>
    `;
    throw new Error("Supabase configuration missing");
}


const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================================
   DOM
   ========================================================= */

const $ = (id) => document.getElementById(id);

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

const toast = $("toast");


/* =========================================================
   STATE
   ========================================================= */

let initialized = false;
let currentUser = null;


/* =========================================================
   LOGIN / APP VISIBILITY
   ========================================================= */

function showLogin() {

    if (adminLogin) {
        adminLogin.hidden = false;
        adminLogin.style.display = "flex";
    }

    if (adminApp) {
        adminApp.hidden = true;
        adminApp.style.display = "none";
    }
}


function showAdminApp() {

    if (adminLogin) {
        adminLogin.hidden = true;
        adminLogin.style.display = "none";
    }

    if (adminApp) {
        adminApp.hidden = false;
        adminApp.style.display = "block";
    }
}


/* =========================================================
   LOGIN MESSAGE
   ========================================================= */

function setLoginMessage(message, type = "error") {

    if (!loginMessage) return;

    loginMessage.textContent = message;
    loginMessage.className = "login-message " + type;
    loginMessage.style.display = "block";
}


function clearLoginMessage() {

    if (!loginMessage) return;

    loginMessage.textContent = "";
    loginMessage.className = "login-message";
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, type = "success") {

    if (!toast) return;

    toast.textContent = message;
    toast.className = "toast " + type;
    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


/* =========================================================
   LOGIN
   ========================================================= */

if (adminLoginForm) {

    adminLoginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        clearLoginMessage();

        const email = adminEmail
            ? adminEmail.value.trim()
            : "";

        const password = adminPassword
            ? adminPassword.value
            : "";


        if (!email || !password) {

            setLoginMessage(
                "Email এবং Password দিন।",
                "error"
            );

            return;
        }


        if (adminLoginBtn) {
            adminLoginBtn.disabled = true;
            adminLoginBtn.textContent = "Logging in...";
        }


        try {

            const { data, error } =
                await sb.auth.signInWithPassword({
                    email,
                    password
                });


            if (error) {

                console.error(
                    "Supabase Login Error:",
                    error
                );

                setLoginMessage(
                    error.message || "Login failed.",
                    "error"
                );

                return;
            }


            if (!data || !data.session) {

                setLoginMessage(
                    "Login হয়েছে কিন্তু session পাওয়া যায়নি। আবার চেষ্টা করুন।",
                    "error"
                );

                return;
            }


            currentUser = data.user;


            /*
             * Login সফল।
             * এখন Login page hide করে Admin Panel দেখানো হবে।
             */

            showAdminApp();

            clearLoginMessage();


            /*
             * Admin Panel initialize
             */

            try {

                await initializeAdmin();

            }
            catch (initError) {

                console.error(
                    "Admin initialization error:",
                    initError
                );

                showToast(
                    "Admin Panel load করতে কিছু সমস্যা হয়েছে।",
                    "error"
                );
            }

        }
        catch (error) {

            console.error(
                "Login exception:",
                error
            );

            setLoginMessage(
                error.message || "Login failed.",
                "error"
            );

        }
        finally {

            if (adminLoginBtn) {
                adminLoginBtn.disabled = false;
                adminLoginBtn.textContent = "Login";
            }
        }

    });

}


/* =========================================================
   CHECK CURRENT SESSION
   ========================================================= */

async function checkSession() {

    try {

        const { data, error } =
            await sb.auth.getSession();


        if (error) {

            console.error(
                "Session Error:",
                error
            );

            showLogin();

            return;
        }


        if (data && data.session) {

            currentUser = data.session.user;

            showAdminApp();

            await initializeAdmin();

        }
        else {

            showLogin();

        }

    }
    catch (error) {

        console.error(
            "Session check failed:",
            error
        );

        showLogin();
    }
}


/* =========================================================
   AUTH STATE
   ========================================================= */

sb.auth.onAuthStateChange((event, session) => {

    console.log(
        "Auth event:",
        event
    );


    if (event === "SIGNED_OUT") {

        currentUser = null;
        initialized = false;

        showLogin();

        if (adminEmail) {
            adminEmail.value = "";
        }

        if (adminPassword) {
            adminPassword.value = "";
        }

        clearLoginMessage();
    }

});


/* =========================================================
   INITIALIZE ADMIN
   ========================================================= */

async function initializeAdmin() {

    if (initialized) {
        return;
    }

    initialized = true;


    try {

        await loadAdminAccount();

        setupNavigation();

        setupSidebar();

        setupRefreshButtons();

        await loadDashboard();

        await loadStores();

        await loadProducts();

        await loadOrders();

        await checkSupabaseStatus();

    }
    catch (error) {

        console.error(
            "Initialize Admin Error:",
            error
        );

        /*
         * initialized false রাখছি যাতে পরে আবার
         * initialize করা যায়।
         */

        initialized = false;

        throw error;
    }
}


/* =========================================================
   ADMIN ACCOUNT
   ========================================================= */

async function loadAdminAccount() {

    const emailDisplay = $("adminEmailDisplay");

    try {

        const { data, error } =
            await sb.auth.getUser();


        if (error) {
            throw error;
        }


        if (data && data.user) {

            currentUser = data.user;

            if (emailDisplay) {
                emailDisplay.textContent =
                    data.user.email || "—";
            }
        }

    }
    catch (error) {

        console.error(
            "Load admin account error:",
            error
        );

        if (emailDisplay) {
            emailDisplay.textContent = "—";
        }
    }
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

    const navItems =
        document.querySelectorAll(".nav-item");

    const pages =
        document.querySelectorAll(".admin-page-section");


    navItems.forEach((button) => {

        button.addEventListener("click", () => {

            const pageName =
                button.dataset.page;


            navItems.forEach((item) => {
                item.classList.remove("active");
            });

            button.classList.add("active");


            pages.forEach((page) => {

                page.classList.remove("active");

            });


            const target =
                $("page-" + pageName);


            if (target) {
                target.classList.add("active");
            }


            /*
             * Mobile sidebar বন্ধ
             */

            if (adminSidebar) {
                adminSidebar.classList.remove("open");
            }

        });

    });
}


/* =========================================================
   SIDEBAR
   ========================================================= */

function setupSidebar() {

    if (!sidebarToggle || !adminSidebar) {
        return;
    }


    sidebarToggle.addEventListener("click", () => {

        adminSidebar.classList.toggle("open");

    });

}


/* =========================================================
   REFRESH BUTTONS
   ========================================================= */

function setupRefreshButtons() {

    const refreshStoresBtn =
        $("refreshStoresBtn");

    const refreshProductsBtn =
        $("refreshProductsBtn");

    const refreshOrdersBtn =
        $("refreshOrdersBtn");


    if (refreshStoresBtn) {

        refreshStoresBtn.addEventListener(
            "click",
            async () => {

                await loadStores();

                showToast(
                    "Stores refreshed",
                    "success"
                );
            }
        );

    }


    if (refreshProductsBtn) {

        refreshProductsBtn.addEventListener(
            "click",
            async () => {

                await loadProducts();

                showToast(
                    "Products refreshed",
                    "success"
                );
            }
        );

    }


    if (refreshOrdersBtn) {

        refreshOrdersBtn.addEventListener(
            "click",
            async () => {

                await loadOrders();

                showToast(
                    "Orders refreshed",
                    "success"
                );
            }
        );

    }

}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function loadDashboard() {

    await loadDashboardStats();

    await loadRecentOrders();

    await loadRecentStores();
}


/* =========================================================
   DASHBOARD STATS
   ========================================================= */

async function loadDashboardStats() {

    const totalStores =
        $("totalStores");

    const totalProducts =
        $("totalProducts");

    const totalOrders =
        $("totalOrders");


    try {

        const storesResult =
            await sb
                .from("stores")
                .select("id", {
                    count: "exact",
                    head: true
                });


        if (storesResult.error) {
            console.error(
                "Stores count error:",
                storesResult.error
            );
        }


        const productsResult =
            await sb
                .from("products")
                .select("id", {
                    count: "exact",
                    head: true
                });


        if (productsResult.error) {
            console.error(
                "Products count error:",
                productsResult.error
            );
        }


        const ordersResult =
            await sb
                .from("orders")
                .select("id", {
                    count: "exact",
                    head: true
                });


        if (ordersResult.error) {
            console.error(
                "Orders count error:",
                ordersResult.error
            );
        }


        if (totalStores) {
            totalStores.textContent =
                storesResult.count ?? 0;
        }


        if (totalProducts) {
            totalProducts.textContent =
                productsResult.count ?? 0;
        }


        if (totalOrders) {
            totalOrders.textContent =
                ordersResult.count ?? 0;
        }

    }
    catch (error) {

        console.error(
            "Dashboard stats error:",
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

    if (!container) return;


    container.innerHTML =
        `<div class="loading">Loading...</div>`;


    try {

        const { data, error } =
            await sb
                .from("stores")
                .select("*")
                .order("created_at", {
                    ascending: false
                })
                .limit(5);


        if (error) {
            throw error;
        }


        if (!data || data.length === 0) {

            container.innerHTML =
                `<div class="empty-state">কোনো Store নেই।</div>`;

            return;
        }


        container.innerHTML = `
            <div class="simple-list">
                ${data.map(store => `
                    <div class="simple-list-item">

                        <div>
                            <strong>
                                ${escapeHtml(
                                    store.name || "Unnamed Store"
                                )}
                            </strong>

                            <small>
                                ${escapeHtml(
                                    store.slug || ""
                                )}
                            </small>
                        </div>

                        <span>
                            ${formatDate(
                                store.created_at
                            )}
                        </span>

                    </div>
                `).join("")}
            </div>
        `;

    }
    catch (error) {

        console.error(
            "Recent stores error:",
            error
        );

        container.innerHTML =
            `<div class="error-state">
                Store load করা যায়নি।
            </div>`;
    }
}


/* =========================================================
   RECENT ORDERS
   ========================================================= */

async function loadRecentOrders() {

    const container =
        $("recentOrders");

    if (!container) return;


    container.innerHTML =
        `<div class="loading">Loading...</div>`;


    try {

        const { data, error } =
            await sb
                .from("orders")
                .select("*")
                .order("created_at", {
                    ascending: false
                })
                .limit(5);


        if (error) {
            throw error;
        }


        if (!data || data.length === 0) {

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
                                Order #${escapeHtml(
                                    String(order.id).slice(0, 8)
                                )}
                            </strong>

                            <small>
                                ${formatDate(
                                    order.created_at
                                )}
                            </small>
                        </div>

                        <span class="status-badge ${statusClass(
                            order.status
                        )}">
                            ${escapeHtml(
                                order.status || "pending"
                            )}
                        </span>

                    </div>
                `).join("")}
            </div>
        `;

    }
    catch (error) {

        console.error(
            "Recent orders error:",
            error
        );

        container.innerHTML =
            `<div class="error-state">
                Order load করা যায়নি।
            </div>`;
    }
}


/* =========================================================
   STORES
   ========================================================= */

async function loadStores() {

    const container =
        $("storesTable");

    if (!container) return;


    container.innerHTML =
        `<div class="loading">Loading Stores...</div>`;


    try {

        const { data, error } =
            await sb
                .from("stores")
                .select("*")
                .order("created_at", {
                    ascending: false
                });


        if (error) {
            throw error;
        }


        if (!data || data.length === 0) {

            container.innerHTML =
                `<div class="empty-state">
                    কোনো Store পাওয়া যায়নি।
                </div>`;

            return;
        }


        container.innerHTML = `
            <div class="table-scroll">

                <table class="admin-table">

                    <thead>
                        <tr>
                            <th>Store</th>
                            <th>Slug</th>
                            <th>Owner</th>
                            <th>Created</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${data.map(store => `

                            <tr>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            store.name || "—"
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        store.slug || "—"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        store.owner_id || "—"
                                    )}
                                </td>

                                <td>
                                    ${formatDate(
                                        store.created_at
                                    )}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>
        `;

    }
    catch (error) {

        console.error(
            "Stores error:",
            error
        );

        container.innerHTML =
            `<div class="error-state">
                Stores load করা যায়নি:
                ${escapeHtml(error.message)}
            </div>`;
    }
}


/* =========================================================
   PRODUCTS
   ========================================================= */

async function loadProducts() {

    const container =
        $("productsTable");

    if (!container) return;


    container.innerHTML =
        `<div class="loading">Loading Products...</div>`;


    try {

        const { data, error } =
            await sb
                .from("products")
                .select(`
                    *,
                    stores (
                        name
                    )
                `)
                .order("created_at", {
                    ascending: false
                });


        if (error) {
            throw error;
        }


        if (!data || data.length === 0) {

            container.innerHTML =
                `<div class="empty-state">
                    কোনো Product পাওয়া যায়নি।
                </div>`;

            return;
        }


        container.innerHTML = `
            <div class="table-scroll">

                <table class="admin-table">

                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Store</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Created</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${data.map(product => `

                            <tr>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            product.name || "—"
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        product.stores?.name || "—"
                                    )}
                                </td>

                                <td>
                                    ৳${formatNumber(
                                        product.price
                                    )}
                                </td>

                                <td>
                                    ${formatNumber(
                                        product.stock ?? 0
                                    )}
                                </td>

                                <td>
                                    ${formatDate(
                                        product.created_at
                                    )}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>
        `;

    }
    catch (error) {

        console.error(
            "Products error:",
            error
        );

        container.innerHTML =
            `<div class="error-state">
                Products load করা যায়নি:
                ${escapeHtml(error.message)}
            </div>`;
    }
}


/* =========================================================
   ORDERS
   ========================================================= */

async function loadOrders() {

    const container =
        $("ordersTable");

    if (!container) return;


    container.innerHTML =
        `<div class="loading">Loading Orders...</div>`;


    try {

        const { data, error } =
            await sb
                .from("orders")
                .select("*")
                .order("created_at", {
                    ascending: false
                });


        if (error) {
            throw error;
        }


        if (!data || data.length === 0) {

            container.innerHTML =
                `<div class="empty-state">
                    কোনো Order পাওয়া যায়নি।
                </div>`;

            return;
        }


        container.innerHTML = `
            <div class="table-scroll">

                <table class="admin-table">

                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Status</th>
                            <th>Total</th>
                            <th>Created</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${data.map(order => `

                            <tr>

                                <td>
                                    <strong>
                                        #${escapeHtml(
                                            String(order.id).slice(0, 8)
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    <span class="status-badge ${statusClass(
                                        order.status
                                    )}">
                                        ${escapeHtml(
                                            order.status || "pending"
                                        )}
                                    </span>
                                </td>

                                <td>
                                    ৳${formatNumber(
                                        order.total ??
                                        order.subtotal ??
                                        0
                                    )}
                                </td>

                                <td>
                                    ${formatDate(
                                        order.created_at
                                    )}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>
        `;

    }
    catch (error) {

        console.error(
            "Orders error:",
            error
        );

        container.innerHTML =
            `<div class="error-state">
                Orders load করা যায়নি:
                ${escapeHtml(error.message)}
            </div>`;
    }
}


/* =========================================================
   USERS
   ========================================================= */

async function loadUsers() {

    const container =
        $("usersTable");

    if (!container) return;


    container.innerHTML =
        `<div class="loading">Loading Users...</div>`;


    /*
     * Supabase Auth users সরাসরি browser থেকে
     * দেখা যায় না।
     *
     * তাই profiles table থাকলে সেটা ব্যবহার করা হবে।
     */

    try {

        const { data, error } =
            await sb
                .from("profiles")
                .select("*")
                .order("created_at", {
                    ascending: false
                });


        if (error) {

            container.innerHTML = `
                <div class="empty-state">
                    Users দেখানোর জন্য <strong>profiles</strong>
                    table/RLS setup প্রয়োজন।
                </div>
            `;

            return;
        }


        if (!data || data.length === 0) {

            container.innerHTML =
                `<div class="empty-state">
                    কোনো User পাওয়া যায়নি।
                </div>`;

            return;
        }


        container.innerHTML = `
            <div class="table-scroll">

                <table class="admin-table">

                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Created</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${data.map(user => `

                            <tr>

                                <td>
                                    ${escapeHtml(
                                        String(
                                            user.id || "—"
                                        ).slice(0, 8)
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        user.name ||
                                        user.full_name ||
                                        "—"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        user.email || "—"
                                    )}
                                </td>

                                <td>
                                    ${formatDate(
                                        user.created_at
                                    )}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>
        `;

    }
    catch (error) {

        console.error(
            "Users error:",
            error
        );

        container.innerHTML =
            `<div class="error-state">
                Users load করা যায়নি।
            </div>`;
    }
}


/* =========================================================
   SUPABASE STATUS
   ========================================================= */

async function checkSupabaseStatus() {

    const status =
        $("supabaseStatus");

    if (!status) return;


    try {

        const { error } =
            await sb
                .from("stores")
                .select("id")
                .limit(1);


        if (error) {

            status.textContent =
                "Connected with restrictions";

            status.style.color =
                "#b45309";

            console.warn(
                "Supabase status:",
                error
            );

        }
        else {

            status.textContent =
                "Connected";

            status.style.color =
                "#15803d";
        }

    }
    catch (error) {

        status.textContent =
            "Connection error";

        status.style.color =
            "#b91c1c";

        console.error(
            "Supabase connection error:",
            error
        );
    }
}


/* =========================================================
   LOGOUT
   ========================================================= */

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            logoutBtn.disabled = true;

            try {

                const { error } =
                    await sb.auth.signOut();


                if (error) {
                    throw error;
                }


                showLogin();

                showToast(
                    "Logout successful",
                    "success"
                );

            }
            catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

                showToast(
                    "Logout failed: " +
                    error.message,
                    "error"
                );

            }
            finally {

                logoutBtn.disabled = false;
            }
        }
    );

}


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatNumber(value) {

    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }


    return number.toLocaleString(
        "en-BD",
        {
            maximumFractionDigits: 2
        }
    );
}


function formatDate(value) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (Number.isNaN(date.getTime())) {
        return "—";
    }


    return date.toLocaleDateString(
        "en-BD",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}


function statusClass(status) {

    const value =
        String(status || "pending")
            .toLowerCase();


    if (
        value === "completed" ||
        value === "delivered" ||
        value === "approved" ||
        value === "paid"
    ) {
        return "success";
    }


    if (
        value === "cancelled" ||
        value === "canceled" ||
        value === "rejected"
    ) {
        return "danger";
    }


    if (
        value === "processing" ||
        value === "shipped"
    ) {
        return "info";
    }


    return "pending";
}


/* =========================================================
   START
   ========================================================= */

showLogin();

checkSession();
