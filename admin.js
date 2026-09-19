/* =========================================================
   BUYHAAT ADMIN PANEL
   Login + Users + Store Approvals + Product Approvals
========================================================= */


/* =========================================================
   SUPABASE CHECK
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
            <h2>Admin Error</h2>
            <p>Supabase configuration পাওয়া যায়নি।</p>
        </div>
    `;

    throw new Error("Supabase configuration missing");
}


/* =========================================================
   SUPABASE
========================================================= */

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================================
   DOM
========================================================= */

const loginPage =
    document.getElementById("loginPage");

const dashboardPage =
    document.getElementById("dashboardPage");

const loginForm =
    document.getElementById("adminLoginForm");

const emailInput =
    document.getElementById("adminEmail");

const passwordInput =
    document.getElementById("adminPassword");

const loginButton =
    document.getElementById("adminLoginBtn");

const loginMessage =
    document.getElementById("loginMessage");

const logoutBtn =
    document.getElementById("logoutBtn");

const adminUserEmail =
    document.getElementById("adminUserEmail");

const settingsEmail =
    document.getElementById("settingsEmail");

const pageTitle =
    document.getElementById("pageTitle");

const pageSubtitle =
    document.getElementById("pageSubtitle");

const mobileMenuBtn =
    document.getElementById("mobileMenuBtn");

const adminSidebar =
    document.getElementById("adminSidebar");


/* =========================================================
   HELPERS
========================================================= */

function showMessage(message, type = "error") {

    if (!loginMessage) return;

    loginMessage.textContent = message;

    loginMessage.className =
        "login-message " + type;
}


function escapeHTML(value) {

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


function formatDate(value) {

    if (!value) return "—";

    try {

        return new Date(value)
            .toLocaleString("bn-BD", {
                dateStyle: "medium",
                timeStyle: "short"
            });

    } catch {

        return value;
    }
}


function statusText(status) {

    const map = {

        pending: "Pending",

        approved: "Approved",

        rejected: "Rejected",

        blocked: "Blocked"

    };

    return map[status] || status || "Unknown";
}


function statusClass(status) {

    return "status-" +
        String(status || "unknown")
            .toLowerCase();
}


/* =========================================================
   LOGIN / DASHBOARD
========================================================= */

function showLogin() {

    if (loginPage) {

        loginPage.hidden = false;
        loginPage.style.display = "flex";

    }

    if (dashboardPage) {

        dashboardPage.hidden = true;
        dashboardPage.style.display = "none";

    }

    document.body.classList.remove(
        "dashboard-active"
    );
}


function showDashboard(user) {

    if (loginPage) {

        loginPage.hidden = true;
        loginPage.style.display = "none";

    }

    if (dashboardPage) {

        dashboardPage.hidden = false;
        dashboardPage.style.display = "flex";

    }

    document.body.classList.add(
        "dashboard-active"
    );


    const email =
        user?.email || "Admin";


    if (adminUserEmail) {

        adminUserEmail.textContent =
            email;

    }


    if (settingsEmail) {

        settingsEmail.textContent =
            email;

    }
}


/* =========================================================
   ADMIN CHECK
========================================================= */

async function checkAdmin() {

    try {

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

            return null;
        }


        const session =
            data?.session;


        if (!session?.user) {

            showLogin();

            return null;
        }


        const {
            data: isAdmin,
            error: adminError
        } = await sb.rpc("is_admin");


        if (adminError) {

            console.error(
                "Admin RPC error:",
                adminError
            );

            await sb.auth.signOut();

            showLogin();

            showMessage(
                adminError.message,
                "error"
            );

            return null;
        }


        if (isAdmin !== true) {

            await sb.auth.signOut();

            showLogin();

            showMessage(
                "এই account-এর Admin access নেই।",
                "error"
            );

            return null;
        }


        showDashboard(
            session.user
        );


        await loadEverything();


        return session.user;

    }

    catch (error) {

        console.error(
            "Admin check error:",
            error
        );

        showLogin();

        return null;
    }
}


/* =========================================================
   LOGIN
========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;


            if (!email || !password) {

                showMessage(
                    "Email এবং Password দিন।",
                    "error"
                );

                return;
            }


            loginButton.disabled = true;

            loginButton.textContent =
                "Logging in...";


            try {

                const {
                    data,
                    error
                } = await sb.auth.signInWithPassword({

                    email,

                    password

                });


                if (error) {

                    showMessage(
                        error.message,
                        "error"
                    );

                    return;
                }


                const {
                    data: isAdmin,
                    error: adminError
                } = await sb.rpc(
                    "is_admin"
                );


                if (adminError) {

                    await sb.auth.signOut();

                    showMessage(
                        "Admin verification করা যায়নি: " +
                        adminError.message,
                        "error"
                    );

                    return;
                }


                if (isAdmin !== true) {

                    await sb.auth.signOut();

                    showMessage(
                        "এই account-এর Admin access নেই।",
                        "error"
                    );

                    return;
                }


                showDashboard(
                    data.user
                );


                showMessage(
                    "",
                    "success"
                );


                await loadEverything();

            }

            catch (error) {

                console.error(error);

                showMessage(
                    error.message ||
                    "Login করার সময় সমস্যা হয়েছে।",
                    "error"
                );

            }

            finally {

                loginButton.disabled = false;

                loginButton.textContent =
                    "Login";

            }

        }
    );
}


/* =========================================================
   LOGOUT
========================================================= */

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            logoutBtn.disabled = true;

            logoutBtn.textContent =
                "Logging out...";


            try {

                await sb.auth.signOut();

                showLogin();

                if (emailInput) {
                    emailInput.value = "";
                }

                if (passwordInput) {
                    passwordInput.value = "";
                }

            }

            finally {

                logoutBtn.disabled = false;

                logoutBtn.innerHTML =
                    "<span>↪</span> Logout";

            }

        }
    );
}


/* =========================================================
   NAVIGATION
========================================================= */

const navItems =
    document.querySelectorAll(
        ".nav-item"
    );

const contentSections =
    document.querySelectorAll(
        ".admin-content-section"
    );


const sectionNames = {

    overview: {
        title: "Dashboard",
        subtitle: "BuyHaat-এর Admin Panel"
    },

    users: {
        title: "Users",
        subtitle: "Registered users পরিচালনা করুন"
    },

    stores: {
        title: "Store Approvals",
        subtitle: "Store approve অথবা reject করুন"
    },

    products: {
        title: "Product Approvals",
        subtitle: "Product approve অথবা reject করুন"
    },

    orders: {
        title: "Orders",
        subtitle: "BuyHaat-এর orders পরিচালনা করুন"
    },

    settings: {
        title: "Settings",
        subtitle: "Admin Panel-এর settings"
    }

};


function openSection(sectionName) {

    navItems.forEach(
        (item) => {

            item.classList.toggle(
                "active",
                item.dataset.section === sectionName
            );

        }
    );


    contentSections.forEach(
        (section) => {

            section.classList.toggle(
                "active",
                section.dataset.content === sectionName
            );

        }
    );


    const info =
        sectionNames[sectionName];


    if (info) {

        if (pageTitle) {
            pageTitle.textContent =
                info.title;
        }

        if (pageSubtitle) {
            pageSubtitle.textContent =
                info.subtitle;
        }

    }


    if (adminSidebar) {

        adminSidebar.classList.remove(
            "mobile-open"
        );

    }


    if (sectionName === "users") {
        loadUsers();
    }

    if (sectionName === "stores") {
        loadStores();
    }

    if (sectionName === "products") {
        loadProducts();
    }

    if (sectionName === "orders") {
        loadOrders();
    }

}


navItems.forEach(
    (item) => {

        item.addEventListener(
            "click",
            () => {

                openSection(
                    item.dataset.section
                );

            }
        );

    }
);


document.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                "[data-go-section]"
            );


        if (!button) return;


        openSection(
            button.dataset.goSection
        );

    }
);


/* =========================================================
   MOBILE MENU
========================================================= */

if (mobileMenuBtn) {

    mobileMenuBtn.addEventListener(
        "click",
        () => {

            adminSidebar?.classList.toggle(
                "mobile-open"
            );

        }
    );

}


/* =========================================================
   DASHBOARD DATA
========================================================= */

async function loadDashboard() {

    try {

        const [
            usersResult,
            storesResult,
            productsResult,
            ordersResult
        ] = await Promise.all([

            sb.rpc("admin_list_users"),

            sb
                .from("stores")
                .select(
                    "id,name,owner_id,is_active,is_approved,approval_status,created_at"
                ),

            sb
                .from("products")
                .select(
                    "id,name,store_id,price,stock,is_active,is_approved,approval_status,created_at"
                ),

            sb
                .from("orders")
                .select("id,status,total,created_at")

        ]);


        if (usersResult.error) {
            throw usersResult.error;
        }

        if (storesResult.error) {
            throw storesResult.error;
        }

        if (productsResult.error) {
            throw productsResult.error;
        }

        if (ordersResult.error) {
            throw ordersResult.error;
        }


        const users =
            usersResult.data || [];

        const stores =
            storesResult.data || [];

        const products =
            productsResult.data || [];

        const orders =
            ordersResult.data || [];


        const normalUsers =
            users.filter(
                user => user.role !== "admin"
            );


        const pendingUsers =
            normalUsers.filter(
                user =>
                    user.approval_status === "pending"
            );


        const pendingStores =
            stores.filter(
                store =>
                    store.approval_status === "pending"
            );


        const pendingProducts =
            products.filter(
                product =>
                    product.approval_status === "pending"
            );


        setText(
            "totalUsers",
            normalUsers.length
        );


        setText(
            "pendingUsers",
            pendingUsers.length
        );


        setText(
            "totalStores",
            stores.length
        );


        setText(
            "pendingStores",
            pendingStores.length
        );


        setText(
            "totalProducts",
            products.length
        );


        setText(
            "pendingProducts",
            pendingProducts.length
        );


        setText(
            "totalOrders",
            orders.length
        );


        const pendingTotal =
            pendingUsers.length +
            pendingStores.length +
            pendingProducts.length;


        const summary =
            document.getElementById(
                "pendingSummary"
            );


        if (summary) {

            if (pendingTotal === 0) {

                summary.innerHTML = `
                    <div class="empty-icon">✅</div>
                    <h3>কোনো Pending Approval নেই</h3>
                    <p>সব approval আপাতত সম্পন্ন।</p>
                `;

            } else {

                summary.innerHTML = `
                    <div class="empty-icon">⏳</div>

                    <h3>
                        ${pendingTotal}টি Approval অপেক্ষমাণ
                    </h3>

                    <p>
                        Users: ${pendingUsers.length}
                        · Stores: ${pendingStores.length}
                        · Products: ${pendingProducts.length}
                    </p>
                `;

            }

        }

    }

    catch (error) {

        console.error(
            "Dashboard load error:",
            error
        );

    }
}


function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


/* =========================================================
   USERS
========================================================= */

async function loadUsers() {

    const container =
        document.getElementById("usersList");


    if (!container) return;


    container.innerHTML =
        `<div class="empty-state">Loading users...</div>`;


    const {
        data,
        error
    } = await sb.rpc(
        "admin_list_users"
    );


    if (error) {

        console.error(error);

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❌</div>
                <h3>Users load করা যায়নি</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;

        return;
    }


    const users =
        (data || []).filter(
            user => user.role !== "admin"
        );


    if (!users.length) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👥</div>
                <h3>কোনো User নেই</h3>
                <p>Registered users এখানে দেখা যাবে।</p>
            </div>
        `;

        return;
    }


    container.className =
        "admin-list";


    container.innerHTML =
        users.map(
            user => {

                const status =
                    user.approval_status ||
                    (user.is_active
                        ? "approved"
                        : "pending");


                return `

                    <div class="admin-list-item">

                        <div class="admin-list-info">

                            <strong>
                                ${escapeHTML(
                                    user.full_name ||
                                    "Unnamed User"
                                )}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    user.email || ""
                                )}
                            </span>

                            <small>
                                ${escapeHTML(
                                    user.phone || ""
                                )}
                                ·
                                ${formatDate(
                                    user.created_at
                                )}
                            </small>

                        </div>


                        <div class="admin-list-actions">

                            <span class="status-badge ${statusClass(status)}">
                                ${statusText(status)}
                            </span>


                            ${
                                status === "pending"
                                ? `
                                    <button
                                        class="approve-btn"
                                        data-user-action="approve"
                                        data-user-id="${user.id}"
                                    >
                                        Approve
                                    </button>

                                    <button
                                        class="reject-btn"
                                        data-user-action="reject"
                                        data-user-id="${user.id}"
                                    >
                                        Reject
                                    </button>
                                `
                                : ""
                            }


                            ${
                                status === "approved"
                                ? `
                                    <button
                                        class="reject-btn"
                                        data-user-action="block"
                                        data-user-id="${user.id}"
                                    >
                                        Block
                                    </button>
                                `
                                : ""
                            }


                            ${
                                status === "blocked" ||
                                status === "rejected"
                                ? `
                                    <button
                                        class="approve-btn"
                                        data-user-action="approve"
                                        data-user-id="${user.id}"
                                    >
                                        Approve
                                    </button>
                                `
                                : ""
                            }

                        </div>

                    </div>

                `;

            }
        ).join("");
}


/* =========================================================
   USER ACTION
========================================================= */

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                "[data-user-action]"
            );


        if (!button) return;


        const userId =
            button.dataset.userId;

        const action =
            button.dataset.userAction;


        if (!userId || !action) return;


        let status = "pending";


        if (action === "approve") {
            status = "approved";
        }

        if (action === "reject") {
            status = "rejected";
        }

        if (action === "block") {
            status = "blocked";
        }


        const oldText =
            button.textContent;

        button.disabled = true;

        button.textContent =
            "Working...";


        try {

            const {
                data,
                error
            } = await sb.rpc(
                "admin_set_user_status",
                {
                    target_user_id: userId,
                    new_status: status
                }
            );


            if (error) {
                throw error;
            }


            if (!data) {
                throw new Error(
                    "User পাওয়া যায়নি অথবা পরিবর্তন করা যায়নি।"
                );
            }


            await loadUsers();

            await loadDashboard();

        }

        catch (error) {

            console.error(error);

            alert(
                "User status পরিবর্তন করা যায়নি:\n" +
                error.message
            );

            button.disabled = false;

            button.textContent =
                oldText;
        }

    }
);


/* =========================================================
   STORES
========================================================= */

async function loadStores() {

    const container =
        document.getElementById("storesList");


    if (!container) return;


    container.innerHTML =
        `<div class="empty-state">Loading stores...</div>`;


    const {
        data,
        error
    } = await sb
        .from("stores")
        .select(
            `
            id,
            name,
            description,
            logo_url,
            cover_url,
            phone,
            address,
            owner_id,
            is_active,
            is_approved,
            approval_status,
            created_at
            `
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❌</div>
                <h3>Stores load করা যায়নি</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;

        return;
    }


    const stores =
        data || [];


    if (!stores.length) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏪</div>
                <h3>কোনো Store নেই</h3>
                <p>Store আবেদন এখানে দেখা যাবে।</p>
            </div>
        `;

        return;
    }


    container.className =
        "admin-list";


    container.innerHTML =
        stores.map(
            store => {

                const status =
                    store.approval_status ||
                    (
                        store.is_approved
                            ? "approved"
                            : "pending"
                    );


                return `

                    <div class="admin-list-item">

                        <div class="admin-list-info">

                            <strong>
                                ${escapeHTML(
                                    store.name ||
                                    "Unnamed Store"
                                )}
                            </strong>

                            <span>
                                Owner ID:
                                ${escapeHTML(
                                    store.owner_id
                                )}
                            </span>

                            <small>
                                ${escapeHTML(
                                    store.phone || ""
                                )}
                                ${
                                    store.address
                                    ? " · " +
                                      escapeHTML(
                                          store.address
                                      )
                                    : ""
                                }
                                ·
                                ${formatDate(
                                    store.created_at
                                )}
                            </small>

                        </div>


                        <div class="admin-list-actions">

                            <span class="status-badge ${statusClass(status)}">
                                ${statusText(status)}
                            </span>


                            ${
                                status === "pending"
                                ? `
                                    <button
                                        class="approve-btn"
                                        data-store-action="approve"
                                        data-store-id="${store.id}"
                                    >
                                        Approve
                                    </button>

                                    <button
                                        class="reject-btn"
                                        data-store-action="reject"
                                        data-store-id="${store.id}"
                                    >
                                        Reject
                                    </button>
                                `
                                : ""
                            }


                            ${
                                status === "approved"
                                ? `
                                    <button
                                        class="reject-btn"
                                        data-store-action="reject"
                                        data-store-id="${store.id}"
                                    >
                                        Reject
                                    </button>
                                `
                                : ""
                            }


                            ${
                                status === "rejected"
                                ? `
                                    <button
                                        class="approve-btn"
                                        data-store-action="approve"
                                        data-store-id="${store.id}"
                                    >
                                        Approve
                                    </button>
                                `
                                : ""
                            }

                        </div>

                    </div>

                `;

            }
        ).join("");
}


/* =========================================================
   STORE ACTION
========================================================= */

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                "[data-store-action]"
            );


        if (!button) return;


        const storeId =
            button.dataset.storeId;

        const action =
            button.dataset.storeAction;


        if (!storeId) return;


        const newStatus =
            action === "approve"
                ? "approved"
                : "rejected";


        button.disabled = true;

        button.textContent =
            "Working...";


        try {

            const {
                error
            } = await sb
                .from("stores")
                .update({

                    approval_status:
                        newStatus,

                    is_approved:
                        newStatus === "approved"

                })
                .eq(
                    "id",
                    storeId
                );


            if (error) {
                throw error;
            }


            await loadStores();

            await loadDashboard();

        }

        catch (error) {

            console.error(error);

            alert(
                "Store status পরিবর্তন করা যায়নি:\n" +
                error.message
            );

            button.disabled = false;

        }

    }
);


/* =========================================================
   PRODUCTS
========================================================= */

async function loadProducts() {

    const container =
        document.getElementById(
            "productsList"
        );


    if (!container) return;


    container.innerHTML =
        `<div class="empty-state">Loading products...</div>`;


    const {
        data,
        error
    } = await sb
        .from("products")
        .select(
            `
            id,
            name,
            description,
            price,
            stock,
            image_url,
            store_id,
            is_active,
            is_approved,
            approval_status,
            created_at
            `
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❌</div>
                <h3>Products load করা যায়নি</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;

        return;
    }


    const products =
        data || [];


    if (!products.length) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🛍️</div>
                <h3>কোনো Product নেই</h3>
                <p>Seller-এর products এখানে দেখা যাবে।</p>
            </div>
        `;

        return;
    }


    container.className =
        "admin-list";


    container.innerHTML =
        products.map(
            product => {

                const status =
                    product.approval_status ||
                    (
                        product.is_approved
                            ? "approved"
                            : "pending"
                    );


                const image =
                    product.image_url
                        ? `
                            <img
                                src="${escapeHTML(
                                    product.image_url
                                )}"
                                style="
                                    width:70px;
                                    height:70px;
                                    object-fit:cover;
                                    border-radius:10px;
                                    margin-right:12px;
                                "
                            >
                          `
                        : "";


                return `

                    <div
                        class="admin-list-item"
                        style="align-items:flex-start;"
                    >

                        <div
                            style="
                                display:flex;
                                flex:1;
                                min-width:0;
                            "
                        >

                            ${image}

                            <div class="admin-list-info">

                                <strong>
                                    ${escapeHTML(
                                        product.name ||
                                        "Unnamed Product"
                                    )}
                                </strong>

                                <span>
                                    Price:
                                    ৳${escapeHTML(
                                        product.price
                                    )}
                                    · Stock:
                                    ${escapeHTML(
                                        product.stock
                                    )}
                                </span>

                                <small>
                                    Store ID:
                                    ${escapeHTML(
                                        product.store_id
                                    )}
                                    ·
                                    ${formatDate(
                                        product.created_at
                                    )}
                                </small>

                            </div>

                        </div>


                        <div class="admin-list-actions">

                            <span class="status-badge ${statusClass(status)}">
                                ${statusText(status)}
                            </span>


                            ${
                                status === "pending"
                                ? `
                                    <button
                                        class="approve-btn"
                                        data-product-action="approve"
                                        data-product-id="${product.id}"
                                    >
                                        Approve
                                    </button>

                                    <button
                                        class="reject-btn"
                                        data-product-action="reject"
                                        data-product-id="${product.id}"
                                    >
                                        Reject
                                    </button>
                                `
                                : ""
                            }


                            ${
                                status === "approved"
                                ? `
                                    <button
                                        class="reject-btn"
                                        data-product-action="reject"
                                        data-product-id="${product.id}"
                                    >
                                        Reject
                                    </button>
                                `
                                : ""
                            }


                            ${
                                status === "rejected"
                                ? `
                                    <button
                                        class="approve-btn"
                                        data-product-action="approve"
                                        data-product-id="${product.id}"
                                    >
                                        Approve
                                    </button>
                                `
                                : ""
                            }

                        </div>

                    </div>

                `;

            }
        ).join("");
}


/* =========================================================
   PRODUCT ACTION
========================================================= */

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                "[data-product-action]"
            );


        if (!button) return;


        const productId =
            button.dataset.productId;

        const action =
            button.dataset.productAction;


        if (!productId) return;


        const newStatus =
            action === "approve"
                ? "approved"
                : "rejected";


        button.disabled = true;

        button.textContent =
            "Working...";


        try {

            const {
                error
            } = await sb
                .from("products")
                .update({

                    approval_status:
                        newStatus,

                    is_approved:
                        newStatus === "approved"

                })
                .eq(
                    "id",
                    productId
                );


            if (error) {
                throw error;
            }


            await loadProducts();

            await loadDashboard();

        }

        catch (error) {

            console.error(error);

            alert(
                "Product status পরিবর্তন করা যায়নি:\n" +
                error.message
            );

            button.disabled = false;

        }

    }
);


/* =========================================================
   ORDERS
========================================================= */

async function loadOrders() {

    const container =
        document.getElementById(
            "ordersList"
        );


    if (!container) return;


    const {
        data,
        error
    } = await sb
        .from("orders")
        .select(
            `
            id,
            buyer_id,
            customer_name,
            customer_phone,
            total,
            payment_method,
            payment_status,
            status,
            created_at
            `
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        )
        .limit(50);


    if (error) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❌</div>
                <h3>Orders load করা যায়নি</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;

        return;
    }


    const orders =
        data || [];


    if (!orders.length) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <h3>No orders yet</h3>
                <p>নতুন orders এখানে দেখা যাবে।</p>
            </div>
        `;

        return;
    }


    container.className =
        "admin-list";


    container.innerHTML =
        orders.map(
            order => `

                <div class="admin-list-item">

                    <div class="admin-list-info">

                        <strong>
                            Order #${escapeHTML(
                                order.id
                                    .slice(0, 8)
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                order.customer_name ||
                                "Customer"
                            )}
                            ·
                            ৳${escapeHTML(
                                order.total
                            )}
                        </span>

                        <small>
                            ${escapeHTML(
                                order.status ||
                                "pending"
                            )}
                            ·
                            ${formatDate(
                                order.created_at
                            )}
                        </small>

                    </div>

                    <div class="admin-list-actions">

                        <span class="status-badge">
                            ${escapeHTML(
                                order.status ||
                                "pending"
                            )}
                        </span>

                    </div>

                </div>

            `
        ).join("");
}


/* =========================================================
   LOAD EVERYTHING
========================================================= */

async function loadEverything() {

    await Promise.all([

        loadDashboard(),

        loadUsers(),

        loadStores(),

        loadProducts(),

        loadOrders()

    ]);

}


/* =========================================================
   AUTH STATE
========================================================= */

sb.auth.onAuthStateChange(
    (event, session) => {

        if (event === "SIGNED_OUT") {

            showLogin();

            return;
        }


        if (
            event === "SIGNED_IN" &&
            session?.user
        ) {

            setTimeout(
                () => {
                    checkAdmin();
                },
                0
            );

        }

    }
);


/* =========================================================
   INITIAL LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        checkAdmin();

    }
);
