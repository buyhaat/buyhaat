/*
=========================================================
BUYHAAT — app.js
IMPORTANT:
Keep your existing Supabase/auth/store/product/order functions.
This file contains the Store-search integration that works
with the current index.html and style.css.

If you already have the rest of your working app.js, use
the STORE SEARCH INTEGRATION section below in that file.
=========================================================
*/

const sb = supabaseClient;

let products = [];
let categories = ["All"];
let followedStores = [];
let stores = [];

let currentMyStore = null;
let currentUser = null;

const $ = (id) => document.getElementById(id);

function money(value) {
  return "৳" + Number(value || 0).toLocaleString("en-BD");
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* =========================================================
   STORE SEARCH DATA
   ========================================================= */

async function loadStores() {
  const { data, error } = await sb
    .from("stores")
    .select(`
      id,
      name,
      slug,
      logo_url,
      cover_url,
      description,
      is_active,
      is_approved
    `)
    .eq("is_active", true)
    .eq("is_approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Store error:", error);
    stores = [];
    return;
  }

  stores = data || [];
}

/* =========================================================
   PRODUCTS
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
      image_url,
      is_active,
      is_approved,
      created_at,
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
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Product error:", error);
    products = [];
    renderProducts();
    return;
  }

  products = (data || []).map(p => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    category: p.categories?.name || "Others",
    store: p.stores?.name || "Unknown Store",
    storeId: p.store_id,
    description: p.description || "",
    stock: p.stock || 0,
    image: p.image_url || null
  }));

  renderProducts(
    document.querySelector(".category.active")?.dataset.category || "All",
    $("searchInput")?.value || ""
  );
}

/* =========================================================
   STORE + PRODUCT SEARCH RENDER
   IMPORTANT:
   #products is ALREADY .product-grid in index.html.
   Therefore product cards are inserted directly.
   ========================================================= */

function renderProducts(category = "All", query = "") {
  const container = $("products");
  if (!container) return;

  let list = products.filter(
    p => category === "All" || p.category === category
  );

  const q = query.trim().toLowerCase();

  if (q) {
    list = list.filter(p =>
      (
        p.name + " " +
        p.store + " " +
        p.category
      ).toLowerCase().includes(q)
    );
  }

  let storeList = [];

  if (q) {
    const usernameQuery = q.replace(/^@/, "");

    storeList = stores.filter(store => {
      const storeName = (store.name || "").toLowerCase();
      const storeUsername = (store.slug || "").toLowerCase();

      return (
        storeName.includes(q) ||
        storeUsername.includes(usernameQuery)
      );
    });
  }

  if ($("productCount")) {
    $("productCount").textContent =
      `${list.length} products` +
      (storeList.length
        ? ` · ${storeList.length} stores`
        : "");
  }

  const storeHTML = storeList.length
    ? `
      <div class="search-store-results">
        <div class="search-section-title">Stores</div>

        ${storeList.map(store => `
          <div
            class="search-store-card"
            data-store-id="${escapeHTML(String(store.id))}"
          >
            <div class="search-store-avatar">
              ${
                store.logo_url
                  ? `
                    <img
                      src="${escapeHTML(store.logo_url)}"
                      alt="${escapeHTML(store.name || "Store")}"
                    >
                  `
                  : escapeHTML(
                      (store.name || "S")
                        .charAt(0)
                        .toUpperCase()
                    )
              }
            </div>

            <div class="search-store-info">
              <h3>${escapeHTML(store.name || "Store")}</h3>
              <p>@${escapeHTML(store.slug || "")}</p>

              ${
                store.description
                  ? `<span>${escapeHTML(store.description)}</span>`
                  : ""
              }
            </div>

            <button
              type="button"
              class="secondary-btn search-store-btn"
            >
              View
            </button>
          </div>
        `).join("")}
      </div>
    `
    : "";

  const productTitle = storeList.length
    ? `<div class="search-section-title">Products</div>`
    : "";

  const productHTML = list.length
    ? `
      ${productTitle}

      ${list.map(p => `
        <article
          class="product-card"
          data-product="${escapeHTML(String(p.id))}"
        >
          <div class="product-image">
            ${
              p.image
                ? `
                  <img
                    src="${escapeHTML(p.image)}"
                    alt="${escapeHTML(p.name)}"
                  >
                `
                : "🛍️"
            }
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
      `).join("")}
    `
    : "";

  if (!storeList.length && !list.length) {
    container.innerHTML = `
      <div class="empty-card">
        <h3>কোনো product বা store পাওয়া যায়নি</h3>
        <p>
          অন্য keyword, product name বা store username চেষ্টা করুন।
        </p>
      </div>
    `;
  } else {
    container.innerHTML = storeHTML + productHTML;
  }

  container.querySelectorAll("[data-product]").forEach(card => {
    card.addEventListener("click", () => {
      if (typeof openProduct === "function") {
        openProduct(card.dataset.product);
      }
    });
  });

  container.querySelectorAll(".search-store-card").forEach(card => {
    card.addEventListener("click", () => {
      showStoreProducts(card.dataset.storeId);
    });
  });

  container.querySelectorAll(".search-store-btn").forEach(button => {
    button.addEventListener("click", e => {
      e.stopPropagation();

      const card = button.closest(".search-store-card");
      if (card) {
        showStoreProducts(card.dataset.storeId);
      }
    });
  });
}

/* =========================================================
   SHOW PRODUCTS FROM ONE STORE
   ========================================================= */

function showStoreProducts(storeId) {
  const store = stores.find(
    s => String(s.id) === String(storeId)
  );

  if (!store) return;

  const searchInput = $("searchInput");

  if (searchInput) {
    searchInput.value = store.name;
  }

  renderProducts("All", store.name);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================================================
   SEARCH EVENTS
   ========================================================= */

$("searchInput")?.addEventListener("input", () => {
  const active = document.querySelector(".category.active");

  renderProducts(
    active?.dataset.category || "All",
    $("searchInput").value || ""
  );
});

$("searchBtn")?.addEventListener("click", () => {
  $("searchInput")?.focus();

  renderProducts(
    "All",
    $("searchInput")?.value || ""
  );
});

/* =========================================================
   BASIC CATEGORY RENDER
   Keep your existing category-loading logic if present.
   ========================================================= */

function renderCategories() {
  const container = $("categories");
  if (!container) return;

  container.innerHTML = categories.map(category => `
    <button
      type="button"
      class="category ${category === "All" ? "active" : ""}"
      data-category="${escapeHTML(category)}"
    >
      ${escapeHTML(category)}
    </button>
  `).join("");

  container.querySelectorAll(".category").forEach(button => {
    button.addEventListener("click", () => {
      container.querySelectorAll(".category")
        .forEach(b => b.classList.remove("active"));

      button.classList.add("active");

      renderProducts(
        button.dataset.category,
        $("searchInput")?.value || ""
      );
    });
  });
}

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  renderCategories();
  renderProducts();
  renderFollowing();

  if (typeof updateAuthState === "function") {
    await updateAuthState();
  }

  if (typeof route === "function") {
    route();
  }

  if (typeof loadCategories === "function") {
    await loadCategories();
  }

  await loadStores();
  await loadProducts();
}

document.addEventListener("DOMContentLoaded", init);
