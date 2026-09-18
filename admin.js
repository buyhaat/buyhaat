/* =========================================================
   BUYHAAT ADMIN PANEL
   Login + Dashboard
   Same /admin URL
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
   SUPABASE CLIENT
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
   LOGIN MESSAGE
========================================================= */

function showMessage(message, type = "error") {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = message;

    loginMessage.className =
        "login-message " + type;
}


/* =========================================================
   SHOW LOGIN
========================================================= */

function showLogin() {

    if (loginPage) {
        loginPage.hidden = false;
    }

    if (dashboardPage) {
        dashboardPage.hidden = true;
    }

    document.body.classList.remove(
        "dashboard-active"
    );

}


/* =========================================================
   SHOW DASHBOARD
========================================================= */

function showDashboard(user) {

    if (loginPage) {
        loginPage.hidden = true;
    }

    if (dashboardPage) {
        dashboardPage.hidden = false;
    }

    document.body.classList.add(
        "dashboard-active"
    );


    const email =
        user?.email || "Admin";


    if (adminUserEmail) {
        adminUserEmail.textContent = email;
    }

    if (settingsEmail) {
        settingsEmail.textContent = email;
    }


    /* Make sure URL stays /admin */

    if (
        window.location.pathname !== "/admin"
    ) {

        window.history.replaceState(
            {},
            "",
            "/admin"
        );

    }

}


/* =========================================================
   CHECK ADMIN
========================================================= */

async function checkAdmin() {

    try {

        const {
            data: sessionData,
            error: sessionError
        } = await sb.auth.getSession();


        if (sessionError) {

            console.error(
                "Session error:",
                sessionError
            );

            showLogin();

            return null;
        }


        const session =
            sessionData?.session;


        if (!session || !session.user) {

            showLogin();

            return null;
        }


        const {
            data: isAdmin,
            error: adminError
        } = await sb.rpc("is_admin");


        if (adminError) {

            console.error(
                "Admin check error:",
                adminError
            );

            await sb.auth.signOut();

            showLogin();

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

        return session.user;

    }

    catch (error) {

        console.error(
            "Admin check exception:",
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


            showMessage(
                "",
                "success"
            );


            try {

                const {
                    data,
                    error
                } = await sb.auth.signInWithPassword({

                    email: email,

                    password: password

                });


                if (error) {

                    console.error(
                        "Login error:",
                        error
                    );

                    showMessage(
                        error.message,
                        "error"
                    );

                    return;
                }


                if (
                    !data ||
                    !data.session ||
                    !data.user
                ) {

                    showMessage(
                        "Login হয়েছে, কিন্তু session পাওয়া যায়নি।",
                        "error"
                    );

                    return;
                }


                /* ---------------------------------------------
                   ADMIN CHECK
                --------------------------------------------- */

                const {
                    data: isAdmin,
                    error: adminError
                } = await sb.rpc(
                    "is_admin"
                );


                if (adminError) {

                    console.error(
                        "is_admin RPC error:",
                        adminError
                    );

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


                /* ---------------------------------------------
                   LOGIN SUCCESS
                   NO REDIRECT
                --------------------------------------------- */

                showDashboard(
                    data.user
                );


                console.log(
                    "Admin login successful:",
                    data.user.email
                );

            }

            catch (error) {

                console.error(
                    "Authentication exception:",
                    error
                );

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

                emailInput.value = "";

                passwordInput.value = "";

                showMessage(
                    "Logout successful.",
                    "success"
                );

            }

            catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

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
   SIDEBAR NAVIGATION
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

    products: {
        title: "Products",
        subtitle: "আপনার সব পণ্য পরিচালনা করুন"
    },

    orders: {
        title: "Orders",
        subtitle: "Customer orders পরিচালনা করুন"
    },

    stores: {
        title: "Stores",
        subtitle: "BuyHaat-এর stores পরিচালনা করুন"
    },

    customers: {
        title: "Customers",
        subtitle: "Customer information পরিচালনা করুন"
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


/* =========================================================
   QUICK ACTIONS / VIEW ALL
========================================================= */

document.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                "[data-go-section]"
            );


        if (!button) {
            return;
        }


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

            if (adminSidebar) {

                adminSidebar.classList.toggle(
                    "mobile-open"
                );

            }

        }
    );

}


/* =========================================================
   AUTH STATE LISTENER
========================================================= */

sb.auth.onAuthStateChange(
    async (event, session) => {

        if (
            event === "SIGNED_OUT"
        ) {

            showLogin();

            return;
        }


        if (
            event === "SIGNED_IN" &&
            session?.user
        ) {

            const {
                data: isAdmin,
                error
            } = await sb.rpc(
                "is_admin"
            );


            if (
                !error &&
                isAdmin === true
            ) {

                showDashboard(
                    session.user
                );

            }

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
