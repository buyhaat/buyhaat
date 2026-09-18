/* =========================================================
   BUYHAAT ADMIN AUTHENTICATION
   Supabase Auth + is_admin() RPC
   ========================================================= */


/* ---------------------------------------------------------
   CHECK SUPABASE
--------------------------------------------------------- */

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
            <h2>Admin Login Error</h2>
            <p>Supabase configuration পাওয়া যায়নি।</p>
        </div>
    `;

    throw new Error("Supabase configuration missing");
}


/* ---------------------------------------------------------
   CREATE SUPABASE CLIENT
--------------------------------------------------------- */

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* ---------------------------------------------------------
   DOM
--------------------------------------------------------- */

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


/* ---------------------------------------------------------
   MESSAGE
--------------------------------------------------------- */

function showMessage(message, type = "error") {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = message;

    loginMessage.className =
        "login-message " + type;
}


/* ---------------------------------------------------------
   LOGIN
--------------------------------------------------------- */

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

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
        loginButton.textContent = "Logging in...";


        showMessage("", "success");


        try {

            /* -------------------------------------------------
               SUPABASE LOGIN
            ------------------------------------------------- */

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


            /* -------------------------------------------------
               SESSION CHECK
            ------------------------------------------------- */

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


            const userId =
                data.user.id;


            console.log(
                "Logged-in user:",
                data.user.email
            );

            console.log(
                "Logged-in user ID:",
                userId
            );


            /* -------------------------------------------------
               ADMIN CHECK
               Uses public.is_admin()
            ------------------------------------------------- */

            const {
                data: isAdmin,
                error: adminError
            } = await sb.rpc("is_admin");


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


            console.log(
                "is_admin() result:",
                isAdmin
            );


            /* -------------------------------------------------
               NOT ADMIN
            ------------------------------------------------- */

            if (isAdmin !== true) {

                await sb.auth.signOut();

                showMessage(
                    "এই account-এর Admin access নেই।",
                    "error"
                );

                return;
            }


            /* -------------------------------------------------
               ADMIN LOGIN SUCCESS
            ------------------------------------------------- */

            console.log(
                "Admin login successful:",
                userId
            );


            showMessage(
                "Login successful. Dashboard খুলছে...",
                "success"
            );


            /* -------------------------------------------------
               CLEAN DASHBOARD URL
            ------------------------------------------------- */

            setTimeout(() => {

                window.location.href =
                    "/admin/dashboard";

            }, 500);

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
            loginButton.textContent = "Login";

        }

    });

}
