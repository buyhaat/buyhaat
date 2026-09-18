/* =========================================================
   MY STORE
   ========================================================= */

async function loadMyStore() {

  const container = $("myStoreContent");

  if (!container) return;


  container.innerHTML = `
    <div class="empty-card">
      <p>Store loading...</p>
    </div>
  `;


  const {
    data: { user },
    error: userError
  } = await sb.auth.getUser();


  if (userError || !user) {

    container.innerHTML = `
      <div class="empty-card">
        <h3>Login required</h3>
        <p>নিজের Store দেখতে আগে Login করুন।</p>
      </div>
    `;

    return;
  }


  const { data: store, error } = await sb
    .from("stores")
    .select(`
      id,
      owner_id,
      name,
      slug,
      description,
      logo_url,
      cover_url,
      phone,
      address,
      is_active,
      is_approved,
      created_at
    `)
    .eq("owner_id", user.id)
    .maybeSingle();


  if (error) {

    console.error(
      "My Store error:",
      error
    );

    container.innerHTML = `
      <div class="empty-card">
        <h3>Store load করা যায়নি</h3>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;

    return;
  }


  if (!store) {

    container.innerHTML = `
      <div class="empty-card">

        <h3>
          আপনার কোনো Store নেই
        </h3>

        <p>
          Create Store থেকে আপনার প্রথম Store তৈরি করুন।
        </p>

        <button
          class="primary-store-btn"
          onclick="document.getElementById('createStoreBtn')?.click()">
          Create Store
        </button>

      </div>
    `;

    return;
  }


  container.innerHTML = `

    <div class="my-store-card">

      ${
        store.cover_url
          ? `
            <div
              class="my-store-cover"
              style="
                background-image:
                url('${escapeHTML(store.cover_url)}');
              ">
            </div>
          `
          : `
            <div class="my-store-cover"></div>
          `
      }


      <div class="my-store-body">

        <div class="my-store-header">

          ${
            store.logo_url
              ? `
                <img
                  class="my-store-logo"
                  src="${escapeHTML(store.logo_url)}"
                  alt="Store Logo">
              `
              : `
                <div class="my-store-logo placeholder">
                  ${escapeHTML(
                    store.name.charAt(0).toUpperCase()
                  )}
                </div>
              `
          }


          <div>

            <h2>
              ${escapeHTML(store.name)}
            </h2>

            <p>
              @${escapeHTML(store.slug)}
            </p>

          </div>

        </div>


        <div class="store-status">

          <span>
            ${
              store.is_active
                ? "Active"
                : "Inactive"
            }
          </span>

          <span>
            ${
              store.is_approved
                ? "Approved"
                : "Pending Approval"
            }
          </span>

        </div>


        ${
          store.description
            ? `
              <p class="my-store-description">
                ${escapeHTML(store.description)}
              </p>
            `
            : ""
        }


        ${
          store.phone
            ? `
              <p>
                📞 ${escapeHTML(store.phone)}
              </p>
            `
            : ""
        }


        ${
          store.address
            ? `
              <p>
                📍 ${escapeHTML(store.address)}
              </p>
            `
            : ""
        }


        <div class="my-store-actions">

          <button
            class="secondary-btn"
            onclick="showToast('Store edit পরের ধাপে যুক্ত হবে')">
            Edit Store
          </button>

          <button
            class="secondary-btn"
            onclick="showToast('Product management পরের ধাপে যুক্ত হবে')">
            Manage Products
          </button>

        </div>

      </div>

    </div>

  `;
}

/* =========================================================
   BUYHAAT — SUPABASE CONNECTED APP
   Products + Categories + Stores
   ========================================================= */

const sb = supabaseClient;


/* =========================================================
   DOM
   ========================================================= */

const $ = id => document.getElementById(id);


/* =========================================================
   DATA
   ========================================================= */

let products = [];
let categories = ["All"];
let followedStores = [];


/* =========================================================
   HELPERS
   ========================================================= */

function money(n) {
  return "৳" + Number(n || 0).toLocaleString("en-BD");
}


function showToast(msg) {
  const t = $("toast");

  if (!t) return;

  t.textContent = msg;
  t.classList.add("show");

  setTimeout(() => {
    t.classList.remove("show");
  }, 2200);
}


/* =========================================================
   LOAD CATEGORIES
   ========================================================= */

async function loadCategories() {

  const { data, error } = await sb
    .from("categories")
    .select("*")
    .order("name");

  if (error) {
    console.error("Category error:", error);
    showToast("Categories load করা যায়নি");
    return;
  }

  categories = [
    "All",
    ...(data || []).map(c => c.name)
  ];

  renderCategories();
}


/* =========================================================
   LOAD PRODUCTS
   ========================================================= */

async function loadProducts() {

  const { data, error } = await sb
    .from("products")
    .select(`
      id,
      name,
      price,
      description,
      stock,
      category_id,
      store_id,
      is_active,
      is_approved,
      categories (
        name
      ),
      stores (
        id,
        name,
        is_active,
        is_approved
      )
    `)
    .eq("is_active", true)
    .eq("is_approved", true)
    .order("created_at", {
      ascending: false
    });

  if (error) {

    console.error("Product error:", error);

    showToast("Products load করা যায়নি");

    return;
  }


  products = (data || [])
    .filter(p =>
      p.stores &&
      p.stores.is_active &&
      p.stores.is_approved
    )
    .map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      category: p.categories?.name || "Others",
      store: p.stores?.name || "Unknown Store",
      storeId: p.store_id,
      description: p.description || "",
      stock: p.stock || 0,
      icon: "🛍️"
    }));


  renderProducts(
    document.querySelector(".category.active")?.dataset.category || "All",
    $("searchInput")?.value || ""
  );
}


/* =========================================================
   RENDER CATEGORIES
   ========================================================= */

function renderCategories() {

  const container = $("categories");

  if (!container) return;

  container.innerHTML = categories.map((c, i) =>

    `<button
      class="category ${i === 0 ? "active" : ""}"
      data-category="${c}">
      ${c}
    </button>`

  ).join("");


  document.querySelectorAll(".category").forEach(btn => {

    btn.addEventListener("click", () => {

      document
        .querySelectorAll(".category")
        .forEach(x =>
          x.classList.remove("active")
        );

      btn.classList.add("active");

      renderProducts(
        btn.dataset.category,
        $("searchInput")?.value || ""
      );

    });

  });
}


/* =========================================================
   RENDER PRODUCTS
   ========================================================= */

function renderProducts(category = "All", query = "") {

  const container = $("products");

  if (!container) return;


  let list = products.filter(p =>

    category === "All" ||
    p.category === category

  );


  const q = query.trim().toLowerCase();


  if (q) {

    list = list.filter(p =>

      (
        p.name +
        " " +
        p.store +
        " " +
        p.category
      )
      .toLowerCase()
      .includes(q)

    );

  }


  if ($("productCount")) {

    $("productCount").textContent =
      list.length + " products";

  }


  container.innerHTML = list.length

    ? list.map(p => `

      <article
        class="product-card"
        data-product="${p.id}">

        <div class="product-image">
          ${p.icon}
        </div>

        <div class="product-info">

          <div class="product-name">
            ${escapeHTML(p.name)}
          </div>

          <div class="price">
            ${money(p.price)}
          </div>

          <div class="store-name">
            ${escapeHTML(p.store)}
          </div>

        </div>

      </article>

    `).join("")

    :

    `
      <div class="empty-card">

        <h3>
          কোনো product পাওয়া যায়নি
        </h3>

        <p>
          অন্য keyword বা category চেষ্টা করুন।
        </p>

      </div>
    `;


  document
    .querySelectorAll("[data-product]")
    .forEach(card => {

      card.addEventListener("click", () => {

        openProduct(
          card.dataset.product
        );

      });

    });

}


/* =========================================================
   PRODUCT DETAIL
   ========================================================= */

function openProduct(id) {

  const p = products.find(
    x => String(x.id) === String(id)
  );

  if (!p) {

    showToast("Product পাওয়া যায়নি");

    return;
  }


  location.hash = "product/" + p.id;


  $("product-detail").innerHTML = `

    <div class="detail">

      <button
        class="back-btn"
        onclick="location.hash='home'">

        ← Back to Home

      </button>


      <div class="detail-card">

        <div class="detail-image">
          ${p.icon}
        </div>


        <div class="detail-body">

          <div class="eyebrow">
            ${escapeHTML(p.category).toUpperCase()}
          </div>


          <h1>
            ${escapeHTML(p.name)}
          </h1>


          <div class="store-name">
            Store: ${escapeHTML(p.store)}
          </div>


          <div class="detail-price">
            ${money(p.price)}
          </div>


          <p class="detail-desc">
            ${escapeHTML(p.description)}
          </p>


          <p>
            Stock:
            <strong>${p.stock}</strong>
          </p>


          <button
            class="order-btn"
            onclick="startOrder('${p.id}')">

            ORDER NOW

          </button>

        </div>

      </div>

    </div>

  `;


  showPage("product-detail");
}


/* =========================================================
   ORDER
   ========================================================= */

function startOrder(id) {

  const p = products.find(
    x => String(x.id) === String(id)
  );

  if (!p) return;


  if (p.stock <= 0) {

    showToast("এই product বর্তমানে stock out");

    return;
  }


  showToast(
    `${p.name} — Order system পরের ধাপে যুক্ত হবে`
  );
}


/* =========================================================
   FOLLOWING
   ========================================================= */

function renderFollowing() {

  const container = $("followingList");

  if (!container) return;


  if (!followedStores.length) {

    container.innerHTML = `

      <div class="empty-card">

        <h3>
          এখনো কোনো store follow করেননি
        </h3>

        <p>
          পছন্দের store follow করলে এখানে দেখা যাবে।
        </p>

      </div>

    `;

    return;
  }


  container.innerHTML =
    followedStores.map(store => `

      <div class="store-card">

        <div class="store-avatar">
          ${escapeHTML(store.charAt(0))}
        </div>

        <div class="store-meta">

          <h3>
            ${escapeHTML(store)}
          </h3>

          <p>
            Followed Store
          </p>

        </div>

        <button
          class="secondary-btn"
          onclick="showToast('Store page পরের ধাপে যুক্ত হবে')">

          View

        </button>

      </div>

    `).join("");

}


/* =========================================================
   PAGE ROUTING
   ========================================================= */

function showPage(page) {

  document
    .querySelectorAll(".page")
    .forEach(p =>
      p.classList.remove("active")
    );


  const target = $(page);

  if (!target) return;


  target.classList.add("active");
if (page === "my-store") {
  loadMyStore();
}

  document
    .querySelectorAll(".bottom-nav a")
    .forEach(a =>

      a.classList.toggle(
        "active",
        a.dataset.page === page
      )

    );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   ROUTER
   ========================================================= */

function route() {

  const hash =
    location.hash.replace("#", "");


  if (hash.startsWith("product/")) {

    openProduct(
      hash.split("/")[1]
    );

    return;
  }


  const page = hash || "home";


  const valid = [
    "home",
    "following",
    "add-product",
    "chat",
    "my-store"
  ];


  showPage(
    valid.includes(page)
      ? page
      : "home"
  );

}


/* =========================================================
   SEARCH
   ========================================================= */

if ($("searchInput")) {

  $("searchInput")
    .addEventListener("input", () => {

      const active =
        document.querySelector(
          ".category.active"
        );


      renderProducts(
        active?.dataset.category || "All",
        $("searchInput").value
      );

    });

}


if ($("searchBtn")) {

  $("searchBtn")
    .addEventListener("click", () => {

      $("searchInput")?.focus();

      renderProducts(
        "All",
        $("searchInput")?.value || ""
      );

    });

}


/* =========================================================
   TEMP BUTTONS
   ========================================================= */


/* =========================================================
   CREATE STORE
   ========================================================= */

$("createStoreBtn")?.addEventListener("click", async () => {

  const {
    data: { user }
  } = await sb.auth.getUser();

  if (!user) {
    showToast("আগে Login করুন");
    return;
  }

  const existing = $("createStoreModal");

  if (existing) {
    existing.classList.add("show");
    return;
  }

  const modal = document.createElement("div");

  modal.id = "createStoreModal";
  modal.className = "store-modal";

  modal.innerHTML = `
    <div class="store-modal-card">

      <button
        type="button"
        class="store-modal-close"
        id="closeCreateStore">
        ×
      </button>

      <h2>Create Your Store</h2>

      <p class="store-modal-subtitle">
        আপনার BuyHaat store তৈরি করুন
      </p>

      <form id="createStoreForm">

        <label>
          Store Name
          <input
            type="text"
            id="storeName"
            placeholder="যেমন: Limon Fashion"
            required
            maxlength="100"
          >
        </label>

        <label>
          Description
          <textarea
            id="storeDescription"
            placeholder="আপনার store সম্পর্কে সংক্ষেপে লিখুন"
            rows="3"
            maxlength="500"
          ></textarea>
        </label>

        <label>
          Phone
          <input
            type="tel"
            id="storePhone"
            placeholder="01XXXXXXXXX"
            maxlength="20"
          >
        </label>

        <label>
          Address
          <textarea
            id="storeAddress"
            placeholder="আপনার দোকান/ব্যবসার ঠিকানা"
            rows="2"
            maxlength="300"
          ></textarea>
        </label>

        <label>
          Logo URL
          <input
            type="url"
            id="storeLogo"
            placeholder="https://..."
          >
        </label>

        <label>
          Cover Image URL
          <input
            type="url"
            id="storeCover"
            placeholder="https://..."
          >
        </label>

        <button
          type="submit"
          id="saveStoreBtn"
          class="primary-store-btn">
          Create Store
        </button>

        <p
          id="storeFormMessage"
          class="store-form-message">
        </p>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  modal.classList.add("show");

  $("closeCreateStore").addEventListener("click", () => {
    modal.remove();
  });

  modal.addEventListener("click", (e) => {

    if (e.target === modal) {
      modal.remove();
    }

  });


  $("createStoreForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const saveBtn = $("saveStoreBtn");
    const message = $("storeFormMessage");

    const name = $("storeName").value.trim();
    const description = $("storeDescription").value.trim();
    const phone = $("storePhone").value.trim();
    const address = $("storeAddress").value.trim();
    const logo_url = $("storeLogo").value.trim();
    const cover_url = $("storeCover").value.trim();


    if (!name) {
      message.textContent = "Store name দিন।";
      return;
    }


    saveBtn.disabled = true;
    saveBtn.textContent = "Creating...";

    message.textContent = "";


    try {

      /*
       * Store slug তৈরি
       */

      const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        + "-" +
        Math.random()
          .toString(36)
          .substring(2, 7);


      const { data, error } = await sb
        .from("stores")
        .insert({

          owner_id: user.id,

          name: name,

          slug: slug,

          description:
            description || null,

          logo_url:
            logo_url || null,

          cover_url:
            cover_url || null,

          phone:
            phone || null,

          address:
            address || null,

          is_active: true,

          is_approved: false

        })
        .select()
        .single();


      if (error) {
        throw error;
      }


      console.log(
        "Store created:",
        data
      );


      message.textContent =
        "Store সফলভাবে তৈরি হয়েছে।";

      showToast(
        "Store তৈরি হয়েছে"
      );


      setTimeout(() => {

        modal.remove();

        location.hash = "my-store";

      }, 700);


    } catch (error) {

      console.error(
        "Create store error:",
        error
      );

      message.textContent =
        error.message ||
        "Store তৈরি করা যায়নি।";

    }


    saveBtn.disabled = false;

    saveBtn.textContent =
      "Create Store";

  });

});

$("menuBtn")?.addEventListener(
  "click",
  () => showToast(
    "Menu options পরের ধাপে যুক্ত হবে"
  )
);


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function init() {

  renderCategories();

  renderProducts();

  renderFollowing();

  route();


  await loadCategories();

  await loadProducts();

}


init();


window.addEventListener(
  "hashchange",
  route
);

/* =========================================================
   AUTHENTICATION
   ========================================================= */

let isRegisterMode = false;


/* ---------- AUTH ELEMENTS ---------- */

const authModal = $("authModal");
const authForm = $("authForm");
const authEmail = $("authEmail");
const authPassword = $("authPassword");
const authTitle = $("authTitle");
const authSubtitle = $("authSubtitle");
const authSubmitBtn = $("authSubmitBtn");
const authSwitchBtn = $("authSwitchBtn");
const authMessage = $("authMessage");
const closeAuthBtn = $("closeAuthBtn");
const logoutBtn = $("logoutBtn");
const accountStatus = $("accountStatus");


/* ---------- OPEN LOGIN ---------- */

$("loginBtn")?.addEventListener("click", () => {

  isRegisterMode = false;

  updateAuthUI();

  authModal?.classList.add("show");

});


/* ---------- CLOSE ---------- */

closeAuthBtn?.addEventListener("click", () => {

  authModal?.classList.remove("show");

});


/* ---------- SWITCH LOGIN / REGISTER ---------- */

authSwitchBtn?.addEventListener("click", () => {

  isRegisterMode = !isRegisterMode;

  updateAuthUI();

});


/* ---------- AUTH UI ---------- */

function updateAuthUI() {

  if (!authTitle) return;


  authTitle.textContent =
    isRegisterMode
      ? "Create Account"
      : "Login";


  authSubtitle.textContent =
    isRegisterMode
      ? "নতুন BuyHaat account তৈরি করুন।"
      : "আপনার BuyHaat account-এ Login করুন।";


  authSubmitBtn.textContent =
    isRegisterMode
      ? "Create Account"
      : "Login";


  authSwitchBtn.textContent =
    isRegisterMode
      ? "আগে থেকেই account আছে? Login করুন"
      : "নতুন account তৈরি করুন";


  authMessage.textContent = "";

}


/* ---------- LOGIN / REGISTER ---------- */

authForm?.addEventListener("submit", async (e) => {

  e.preventDefault();


  const email =
    authEmail.value.trim();

  const password =
    authPassword.value;


  if (!email || !password) {

    authMessage.textContent =
      "Email এবং password দিন।";

    return;
  }


  authSubmitBtn.disabled = true;

  authSubmitBtn.textContent =
    isRegisterMode
      ? "Creating..."
      : "Logging in...";


  try {

    if (isRegisterMode) {

      const { data, error } =
        await sb.auth.signUp({
          email,
          password
        });


      if (error) throw error;


      if (data.user) {

        authMessage.textContent =
          "Account তৈরি হয়েছে। Email verification প্রয়োজন হতে পারে।";

      }

    } else {

      const { data, error } =
        await sb.auth.signInWithPassword({
          email,
          password
        });


      if (error) throw error;


      authModal.classList.remove("show");

      showToast("Login সফল হয়েছে");

      await updateAuthState();

    }

  } catch (error) {

    console.error("Auth error:", error);

    authMessage.textContent =
      error.message || "Authentication failed.";

  }


  authSubmitBtn.disabled = false;

  updateAuthUI();

});


/* ---------- LOGOUT ---------- */

logoutBtn?.addEventListener("click", async () => {

  const { error } =
    await sb.auth.signOut();


  if (error) {

    console.error(error);

    showToast("Logout করা যায়নি");

    return;
  }


  showToast("Logout সফল হয়েছে");

  await updateAuthState();

});


/* ---------- AUTH STATE ---------- */

async function updateAuthState() {

  const {
    data: { user }
  } = await sb.auth.getUser();


  if (user) {

    if ($("loginBtn")) {
      $("loginBtn").style.display = "none";
    }


    if (logoutBtn) {
      logoutBtn.style.display = "inline-flex";
    }


    if (accountStatus) {

      accountStatus.textContent =
        `Logged in: ${user.email}`;

    }

  } else {

    if ($("loginBtn")) {
      $("loginBtn").style.display = "inline-flex";
    }


    if (logoutBtn) {
      logoutBtn.style.display = "none";
    }


    if (accountStatus) {

      accountStatus.textContent =
        "Buyer account, seller account এবং Store management এখানে থাকবে।";

    }

  }

}


/* ---------- LISTEN FOR SESSION CHANGES ---------- */

sb.auth.onAuthStateChange(
  async (event, session) => {

    console.log(
      "Auth event:",
      event
    );

    await updateAuthState();

  }
);


/* ---------- INITIAL AUTH CHECK ---------- */

updateAuthState();
