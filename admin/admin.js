/* =========================================================
   BUYHAAT ADMIN PANEL
   Login → Admin Panel → Dashboard
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

const $ = (id) =>
    document.getElementById(id);


function esc(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function money(value) {

    const number =
        Number(value || 0);

    return `৳${number.toLocaleString("en-BD")}`;
}


function dateText(value) {

    if (!value) {
        return "—";
    }

    try {

        return new Date(value)
            .toLocaleString(
                "en-BD",
                {
                    dateStyle: "medium",
                    timeStyle: "short"
                }
            );

    } catch {

        return String(value);

    }
}


function shortId(value) {

    if (!value) {
        return "—";
    }

    return String(value)
        .slice(0, 8);
}


/* =========================================================
   ELEMENTS
========================================================= */

const adminLogin =
    $("adminLogin");

const adminApp =
    $("adminApp");

const adminLoginForm =
    $("adminLoginForm");

const adminEmail =
    $("adminEmail");

const adminPassword =
    $("adminPassword");

const adminLoginBtn =
    $("adminLoginBtn");

const loginMessage =
    $("loginMessage");

const logoutBtn =
    $("logoutBtn");

const sidebarToggle =
    $("sidebarToggle");

const adminSidebar =
    $("adminSidebar");


/* =========================================================
   SHOW LOGIN
========================================================= */

function showLogin() {

    adminLogin.hidden = false;

    adminApp.hidden = true;

    document.body.classList.remove(
        "logged-in"
    );

}


/* =========================================================
   SHOW ADMIN
========================================================= */

function showAdminApp() {

    adminLogin.hidden = true;

    adminApp.hidden = false;

    document.body.classList.add(
        "logged-in"
    );

}


/* =========================================================
   LOGIN MESSAGE
========================================================= */

function setLoginMessage(
    message,
    type = "error"
) {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent =
        message;


    if (type === "success") {

        loginMessage.style.color =
            "#16a34a";

    } else {

        loginMessage.style.color =
            "#dc2626";

    }

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message,
    type = "success"
) {

    const toast =
        $("toast");

    if (!toast) {
        return;
    }


    toast.textContent =
        message;


    toast.className =
        "toast show";


    if (type === "error") {

        toast.style.background =
            "#dc2626";

    } else {

        toast.style.background =
            "#111827";

    }


    setTimeout(() => {

        toast.classList.remove(
            "show"
        );

    }, 3000);

}


/* =========================================================
   LOGIN
========================================================= */

adminLoginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const email =
            adminEmail.value.trim();

        const password =
            adminPassword.value;


        if (!email || !password) {

            setLoginMessage(
                "Email এবং Password দুটোই দিন।"
            );

            return;
        }


        adminLoginBtn.disabled =
            true;

        adminLoginBtn.textContent =
            "Login হচ্ছে...";


        setLoginMessage(
            "Account যাচাই করা হচ্ছে...",
            "success"
        );


        try {

            const {
                data,
                error
            } =
                await sb.auth
                    .signInWithPassword({
                        email,
                        password
                    });


            /* =============================================
               ERROR
            ============================================== */

            if (error) {

                console.error(
                    "Supabase Login Error:",
                    error
                );


                setLoginMessage(
                    "Login ব্যর্থ: " +
                    error.message
                );


                adminLoginBtn.disabled =
                    false;

                adminLoginBtn.textContent =
                    "Login";

                return;
            }


            /* =============================================
               SUCCESS
            ============================================== */

            if (!data?.session) {

                setLoginMessage(
                    "Login হয়েছে, কিন্তু session পাওয়া যায়নি।"
                );


                adminLoginBtn.disabled =
                    false;

                adminLoginBtn.textContent =
                    "Login";

                return;
            }


            console.log(
                "Login successful:",
                data.user?.email
            );


            setLoginMessage(
                "✓ Login সফল! Admin Panel খুলছে...",
                "success"
            );


            adminLoginBtn.textContent =
                "Success ✓";


            /*
               সরাসরি Admin Panel দেখানো
            */

            showAdminApp();


            /*
               Dashboard initialize
            */

            await initializeAdmin();


        } catch (error) {

            console.error(
                "Login Exception:",
                error
            );


            setLoginMessage(
                "একটি সমস্যা হয়েছে: " +
                (
                    error?.message ||
                    "Unknown error"
                )
            );


            adminLoginBtn.disabled =
                false;

            adminLoginBtn.textContent =
                "Login";

        }

    }
);


/* =========================================================
   LOGOUT
========================================================= */

logoutBtn.addEventListener(
    "click",
    async () => {

        logoutBtn.disabled =
            true;


        const {
            error
        } =
            await sb.auth.signOut();


        logoutBtn.disabled =
            false;


        if (error) {

            showToast(
                error.message,
                "error"
            );

            return;
        }


        adminInitialized =
            false;


        showLogin();


        adminEmail.value =
            "";

        adminPassword.value =
            "";

        adminLoginBtn.disabled =
            false;

        adminLoginBtn.textContent =
            "Login";

        setLoginMessage("");

    }
);


/* =========================================================
   SESSION CHECK
========================================================= */

async function checkSession() {

    /*
       প্রথমেই Login Page দেখানো হবে।
    */

    showLogin();


    try {

        const {
            data,
            error
        } =
            await sb.auth.getSession();


        if (error) {

            console.error(
                "Session Error:",
                error
            );

            showLogin();

            return;
        }


        if (!data?.session) {

            showLogin();

            return;
        }


        /*
           আগে থেকেই login করা থাকলে
           সরাসরি Admin Panel।
        */

        showAdminApp();


        await initializeAdmin();


    } catch (error) {

        console.error(
            "Session Check Error:",
            error
        );

        showLogin();

    }

}


/* =========================================================
   ADMIN INITIALIZE
========================================================= */

let adminInitialized =
    false;


async function initializeAdmin() {

    if (adminInitialized) {
        return;
    }


    adminInitialized =
        true;


    try {

        const {
            data,
            error
        } =
            await sb.auth.getUser();


        if (error) {

            console.error(
                "Get User Error:",
                error
            );

        }


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


    } catch (error) {

        console.error(
            "Admin Initialization Error:",
            error
        );

        /*
           Initialization error হলেও
           Login Page-এ ফেরত যাবে না।
           কারণ login সফল হয়েছে।
        */

    }

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


    navItems.forEach(
        (item) => {

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


                    if (
                        page === "dashboard"
                    ) {

                        await loadDashboard();

                    }


                    if (
                        page === "stores"
                    ) {

                        await loadStores();

                    }


                    if (
                        page === "products"
                    ) {

                        await loadProducts();

                    }


                    if (
                        page === "orders"
                    ) {

                        await loadOrders();

                    }


                    /*
                       Mobile sidebar বন্ধ
                    */

                    if (
                        window.innerWidth <= 850
                    ) {

                        adminSidebar.classList.remove(
                            "open"
                        );

                    }

                }
            );

        }
    );

}


/* =========================================================
   SIDEBAR
========================================================= */

function setupSidebar() {

    sidebarToggle.addEventListener(
        "click",
        () => {

            adminSidebar.classList.toggle(
                "open"
            );

        }
    );

}


/* =========================================================
   REFRESH
========================================================= */

function setupRefreshButtons() {

    $("refreshStoresBtn")
        ?.addEventListener(
            "click",
            loadStores
        );


    $("refreshProductsBtn")
        ?.addEventListener(
            "click",
            loadProducts
        );


    $("refreshOrdersBtn")
        ?.addEventListener(
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


        $("totalUsers").textContent =
            "—";


    } catch (error) {

        console.error(
            "Stats Error:",
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
        `<div class="loading">
            Loading...
        </div>`;


    const {
        data,
        error
    } =
        await sb
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

        <table class="admin-table">

            <thead>

                <tr>

                    <th>
                        Store
                    </th>

                    <th>
                        Slug
                    </th>

                    <th>
                        Created
                    </th>

                </tr>

            </thead>


            <tbody>

                ${data.map(
                    store => `

                    <tr>

                        <td>
                            <strong>
                                ${esc(
                                    store.name ||
                                    store.store_name ||
                                    "Unnamed Store"
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

                    </tr>

                `
                ).join("")}

            </tbody>

        </table>

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
        `<div class="loading">
            Loading...
        </div>`;


    const {
        data,
        error
    } =
        await sb
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

        <table class="admin-table">

            <thead>

                <tr>

                    <th>
                        Order ID
                    </th>

                    <th>
                        Total
                    </th>

                    <th>
                        Status
                    </th>

                    <th>
                        Created
                    </th>

                </tr>

            </thead>


            <tbody>

                ${data.map(
                    order => `

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

                            <span class="
                                status
                                status-${esc(
                                    order.status ||
                                    "pending"
                                )}
                            ">

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

                    </tr>

                `
                ).join("")}

            </tbody>

        </table>

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
        `<div class="loading">
            Loading stores...
        </div>`;


    const {
        data,
        error
    } =
        await sb
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

        <div class="table-wrapper">

            <table class="admin-table">

                <thead>

                    <tr>

                        <th>
                            Store
                        </th>

                        <th>
                            Slug
                        </th>

                        <th>
                            Created
                        </th>

                        <th>
                            Action
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${data.map(
                        store => `

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
                                    class="action-btn danger"
                                    data-delete-store="${esc(
                                        store.id
                                    )}"
                                    type="button"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>

                    `
                    ).join("")}

                </tbody>

            </table>

        </div>

    `;


    container
        .querySelectorAll(
            "[data-delete-store]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const id =
                            button.dataset
                                .deleteStore;


                        if (
                            !confirm(
                                "এই Store delete করতে চান?"
                            )
                        ) {
                            return;
                        }


                        const {
                            error
                        } =
                            await sb
                                .from("stores")
                                .delete()
                                .eq(
                                    "id",
                                    id
                                );


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

            }
        );

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
        `<div class="loading">
            Loading products...
        </div>`;


    const {
        data,
        error
    } =
        await sb
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

        <div class="table-wrapper">

            <table class="admin-table">

                <thead>

                    <tr>

                        <th>
                            Product
                        </th>

                        <th>
                            Price
                        </th>

                        <th>
                            Stock
                        </th>

                        <th>
                            Created
                        </th>

                        <th>
                            Action
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${data.map(
                        product => `

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
                                    class="action-btn danger"
                                    data-delete-product="${esc(
                                        product.id
                                    )}"
                                    type="button"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>

                    `
                    ).join("")}

                </tbody>

            </table>

        </div>

    `;


    container
        .querySelectorAll(
            "[data-delete-product]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const id =
                            button.dataset
                                .deleteProduct;


                        if (
                            !confirm(
                                "এই Product delete করতে চান?"
                            )
                        ) {
                            return;
                        }


                        const {
                            error
                        } =
                            await sb
                                .from("products")
                                .delete()
                                .eq(
                                    "id",
                                    id
                                );


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

            }
        );

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
        `<div class="loading">
            Loading orders...
        </div>`;


    const {
        data,
        error
    } =
        await sb
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

        <div class="table-wrapper">

            <table class="admin-table">

                <thead>

                    <tr>

                        <th>
                            Order ID
                        </th>

                        <th>
                            Total
                        </th>

                        <th>
                            Status
                        </th>

                        <th>
                            Created
                        </th>

                        <th>
                            Action
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${data.map(
                        order => `

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

                                <span class="
                                    status
                                    status-${esc(
                                        order.status ||
                                        "pending"
                                    )}
                                ">

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
                                    class="action-btn"
                                    data-view-order="${esc(
                                        order.id
                                    )}"
                                    type="button"
                                >
                                    View
                                </button>

                            </td>

                        </tr>

                    `
                    ).join("")}

                </tbody>

            </table>

        </div>

    `;


    container
        .querySelectorAll(
            "[data-view-order]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const id =
                            button.dataset
                                .viewOrder;


                        const {
                            data,
                            error
                        } =
                            await sb
                                .from("orders")
                                .select("*")
                                .eq(
                                    "id",
                                    id
                                )
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

            }
        );

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


    try {

        const {
            error
        } =
            await sb
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


    } catch (error) {

        element.textContent =
            "Connection Error";

        element.style.color =
            "#dc2626";

        console.error(
            "Supabase Check Error:",
            error
        );

    }

}


/* =========================================================
   START
========================================================= */

checkSession();
