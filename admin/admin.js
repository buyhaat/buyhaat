/* =========================================================
   BUYHAAT ADMIN — LOGIN DEBUG
   ========================================================= */

console.log("ADMIN JS STARTED");


/* =========================================================
   ELEMENTS
   ========================================================= */

const adminLogin = document.getElementById("adminLogin");
const adminApp = document.getElementById("adminApp");

const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const loginMessage = document.getElementById("loginMessage");


/* =========================================================
   DEBUG MESSAGE
   ========================================================= */

function debug(message, type = "normal") {

    console.log("[ADMIN DEBUG]", message);

    if (loginMessage) {

        loginMessage.textContent = message;

        loginMessage.style.display = "block";
        loginMessage.style.padding = "12px";
        loginMessage.style.marginTop = "15px";
        loginMessage.style.borderRadius = "8px";
        loginMessage.style.fontSize = "14px";
        loginMessage.style.lineHeight = "1.5";

        if (type === "error") {
            loginMessage.style.background = "#fee2e2";
            loginMessage.style.color = "#991b1b";
        }

        else if (type === "success") {
            loginMessage.style.background = "#dcfce7";
            loginMessage.style.color = "#166534";
        }

        else {
            loginMessage.style.background = "#f3f4f6";
            loginMessage.style.color = "#374151";
        }
    }
}


/* =========================================================
   BASIC CHECK
   ========================================================= */

debug("Admin JS চালু হয়েছে...");


if (!adminLogin) {
    debug("ERROR: #adminLogin পাওয়া যায়নি।", "error");
}

if (!adminApp) {
    debug("ERROR: #adminApp পাওয়া যায়নি।", "error");
}

if (!adminLoginForm) {
    debug("ERROR: #adminLoginForm পাওয়া যায়নি।", "error");
}

if (!adminEmail) {
    debug("ERROR: #adminEmail পাওয়া যায়নি।", "error");
}

if (!adminPassword) {
    debug("ERROR: #adminPassword পাওয়া যায়নি।", "error");
}

if (!adminLoginBtn) {
    debug("ERROR: #adminLoginBtn পাওয়া যায়নি।", "error");
}


/* =========================================================
   SUPABASE CONFIG CHECK
   ========================================================= */

if (typeof window.supabase === "undefined") {

    debug(
        "ERROR: Supabase library পাওয়া যায়নি।",
        "error"
    );

}

else if (typeof SUPABASE_URL === "undefined") {

    debug(
        "ERROR: SUPABASE_URL পাওয়া যায়নি।",
        "error"
    );

}

else if (typeof SUPABASE_ANON_KEY === "undefined") {

    debug(
        "ERROR: SUPABASE_ANON_KEY পাওয়া যায়নি।",
        "error"
    );

}

else {

    debug("Supabase config পাওয়া গেছে।");

}


/* =========================================================
   CREATE SUPABASE CLIENT
   ========================================================= */

let sb = null;

try {

    if (
        typeof window.supabase !== "undefined" &&
        typeof SUPABASE_URL !== "undefined" &&
        typeof SUPABASE_ANON_KEY !== "undefined"
    ) {

        sb = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        );

        console.log("Supabase client:", sb);

        debug("Supabase client তৈরি হয়েছে।");

    }

}
catch (error) {

    console.error("Supabase client error:", error);

    debug(
        "ERROR: Supabase client তৈরি করা যায়নি: " +
        error.message,
        "error"
    );

}


/* =========================================================
   SHOW LOGIN
   ========================================================= */

function showLogin() {

    console.log("showLogin()");

    if (adminLogin) {
        adminLogin.hidden = false;
        adminLogin.style.display = "flex";
    }

    if (adminApp) {
        adminApp.hidden = true;
        adminApp.style.display = "none";
    }
}


/* =========================================================
   SHOW ADMIN
   ========================================================= */

function showAdminApp() {

    console.log("showAdminApp()");

    if (adminLogin) {
        adminLogin.hidden = true;
        adminLogin.style.display = "none";
    }

    if (adminApp) {
        adminApp.hidden = false;
        adminApp.style.display = "block";
    }

    debug(
        "LOGIN সফল হয়েছে। Admin Panel দেখানো হচ্ছে।",
        "success"
    );
}


/* =========================================================
   LOGIN
   ========================================================= */

if (adminLoginForm) {

    adminLoginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            console.log("LOGIN BUTTON CLICKED");

            debug("Login request পাঠানো হচ্ছে...");

            if (!sb) {

                debug(
                    "ERROR: Supabase client তৈরি হয়নি।",
                    "error"
                );

                return;
            }


            const email = adminEmail.value.trim();
            const password = adminPassword.value;


            console.log("Email:", email);
            console.log(
                "Password length:",
                password.length
            );


            if (!email || !password) {

                debug(
                    "Email এবং Password দুটোই দিতে হবে।",
                    "error"
                );

                return;
            }


            adminLoginBtn.disabled = true;
            adminLoginBtn.textContent = "Logging in...";


            try {

                console.log(
                    "Calling supabase.auth.signInWithPassword..."
                );

                const result =
                    await sb.auth.signInWithPassword({

                        email: email,

                        password: password

                    });


                console.log(
                    "LOGIN RESULT:",
                    result
                );


                const { data, error } = result;


                /* -----------------------------------------
                   ERROR
                   ----------------------------------------- */

                if (error) {

                    console.error(
                        "SUPABASE LOGIN ERROR:",
                        error
                    );

                    debug(
                        "LOGIN ERROR: " +
                        error.message,
                        "error"
                    );

                    adminLoginBtn.disabled = false;
                    adminLoginBtn.textContent = "Login";

                    return;
                }


                /* -----------------------------------------
                   SUCCESS CHECK
                   ----------------------------------------- */

                if (!data) {

                    debug(
                        "Supabase কোনো data ফেরত দেয়নি।",
                        "error"
                    );

                    adminLoginBtn.disabled = false;
                    adminLoginBtn.textContent = "Login";

                    return;
                }


                console.log(
                    "Session:",
                    data.session
                );

                console.log(
                    "User:",
                    data.user
                );


                if (!data.session) {

                    debug(
                        "Login request সফল হলেও Session পাওয়া যায়নি।",
                        "error"
                    );

                    adminLoginBtn.disabled = false;
                    adminLoginBtn.textContent = "Login";

                    return;
                }


                /* -----------------------------------------
                   LOGIN SUCCESS
                   ----------------------------------------- */

                debug(
                    "Login সফল! এখন Admin Panel খুলছি...",
                    "success"
                );


                showAdminApp();


                adminLoginBtn.disabled = false;
                adminLoginBtn.textContent = "Login";


            }
            catch (error) {

                console.error(
                    "LOGIN CATCH ERROR:",
                    error
                );

                debug(
                    "Unexpected error: " +
                    error.message,
                    "error"
                );


                adminLoginBtn.disabled = false;
                adminLoginBtn.textContent = "Login";

            }

        }
    );

}
else {

    debug(
        "ERROR: Login form পাওয়া যায়নি।",
        "error"
    );

}


/* =========================================================
   INITIAL SESSION CHECK
   ========================================================= */

async function checkSession() {

    console.log("Checking existing session...");


    if (!sb) {

        debug(
            "Session check করা যাচ্ছে না — Supabase client নেই।",
            "error"
        );

        return;
    }


    try {

        const { data, error } =
            await sb.auth.getSession();


        console.log(
            "INITIAL SESSION:",
            data
        );


        if (error) {

            console.error(
                "SESSION ERROR:",
                error
            );

            debug(
                "Session check error: " +
                error.message,
                "error"
            );

            return;
        }


        if (data.session) {

            console.log(
                "Existing session found."
            );

            showAdminApp();

        }

        else {

            console.log(
                "No existing session."
            );

            showLogin();

            debug(
                "Login করার জন্য Email ও Password দিন।"
            );

        }

    }
    catch (error) {

        console.error(
            "SESSION CHECK CATCH:",
            error
        );

        debug(
            "Session check failed: " +
            error.message,
            "error"
        );

    }

}


/* =========================================================
   START
   ========================================================= */

showLogin();

checkSession();


/* =========================================================
   AUTH STATE
   ========================================================= */

if (sb) {

    sb.auth.onAuthStateChange(
        function (event, session) {

            console.log(
                "AUTH EVENT:",
                event,
                session
            );


            if (event === "SIGNED_OUT") {

                showLogin();

                debug(
                    "Logout হয়েছে। আবার Login করুন।"
                );

            }

        }
    );

}
