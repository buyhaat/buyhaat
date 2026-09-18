const sb = window.supabaseClient || window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

async function uploadImage(file, folder) {
  if (!file) return null;

  const ext =
    file.name.split(".").pop().toLowerCase();

  const fileName =
    `${folder}/${crypto.randomUUID()}.${ext}`;

  const {
    error
  } = await sb.storage
    .from("store-images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) {
    console.error("Image upload error:", error);
    toast(error.message || "Image upload failed");
    return null;
  }

  const {
    data
  } = sb.storage
    .from("store-images")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

let products = [];
let stores = [];
let categories = ["All"];
let followedStores = [];
let currentUser = null;
let currentMyStore = null;
let currentCategory = "All";
let authMode = "login";
let editingProductId = null;

const $ = (id) => document.getElementById(id);

const esc = (v) => String(v ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const money = (v) => "৳" + Number(v || 0).toLocaleString("en-BD", {
  maximumFractionDigits: 2
});

function toast(message) {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2400);
}

/* ---------------- ROUTING + MENU ---------------- */

function closeMenu() {
  $("sideMenu")?.classList.remove("open");
  document.body.classList.remove("menu-open");
}

function openMenu() {
  if ((location.hash || "#home") !== "#home") return;
  $("sideMenu")?.classList.add("open");
  document.body.classList.add("menu-open");
}

function go(page) {
  closeMenu();
  location.hash = "#" + page;
}

function route() {
  let page = (location.hash || "#home").slice(1).split("?")[0];

  const valid = [
    "home",
    "following",
    "add-product",
    "chat",
    "my-store",
    "product-detail"
  ];

  if (!valid.includes(page)) {
    page = "home";
    if (location.hash !== "#home") history.replaceState(null, "", "#home");
  }

  document.querySelectorAll(".page").forEach((el) => {
    el.classList.toggle("active-page", el.id === page);
  });

  document.querySelectorAll(".bottom button").forEach((el) => {
    el.classList.toggle("active", el.dataset.route === page);
  });

  /* Menu button is visible ONLY on Home. */
  $("menuBtn")?.classList.toggle("hidden", page !== "home");

  /* Header search button is useful only on Home. */
  $("headerSearchBtn")?.classList.toggle("hidden", page !== "home");

  closeMenu();

  if (page === "home") {
    renderCategories();
    renderProducts(currentCategory, $("searchInput")?.value || "");
  }

  if (page === "following") renderFollowing();
  if (page === "my-store") renderMyStore();

  window.scrollTo({ top: 0, behavior: "instant" });
}

window.addEventListener("hashchange", route);

/* ---------------- AUTH ---------------- */

async function updateAuth() {
  if (!sb?.auth) return;

  const { data, error } = await sb.auth.getSession();

  if (error) {
    console.error("Auth session error:", error);
    return;
  }

  currentUser = data?.session?.user || null;

  await loadMyStore();
  await loadFollowing();
  updateAccount();
}

async function loadMyStore() {
  currentMyStore = null;

  if (!currentUser) return;

  const { data, error } = await sb
    .from("stores")
    .select("*")
    .eq("owner_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("My store error:", error);
    return;
  }

  currentMyStore = data || null;
}

function updateAccount() {
  const status = $("accountStatus");
  const loginBtn = $("loginBtn");
  const logoutBtn = $("logoutBtn");
  const createBtn = $("createStoreBtn");

  if (!status) return;

  if (!currentUser) {
    status.innerHTML = `
      <div class="card">
        <b>Guest user</b><br>
        <span class="store-meta">Login করলে Store management ব্যবহার করতে পারবে।</span>
      </div>
    `;

    loginBtn?.classList.remove("hidden");
    logoutBtn?.classList.add("hidden");
    createBtn?.classList.add("hidden");
    return;
  }

  status.innerHTML = `
    <div class="card">
      <b>${esc(currentUser.email)}</b><br>
      <span class="store-meta">Logged in</span>
    </div>
  `;

  loginBtn?.classList.add("hidden");
  logoutBtn?.classList.remove("hidden");
  createBtn?.classList.toggle("hidden", !!currentMyStore);
}

function openAuth(mode = "login") {
  authMode = mode;

  $("authTitle").textContent =
    mode === "login" ? "Login" : "Create account";

  $("authSubtitle").textContent =
    mode === "login"
      ? "তোমার BuyHaat account-এ login করো।"
      : "নতুন BuyHaat account তৈরি করো।";

  $("authSubmitBtn").textContent =
    mode === "login" ? "Login" : "Register";

  $("authSwitchBtn").textContent =
    mode === "login"
      ? "নতুন অ্যাকাউন্ট তৈরি করুন"
      : "আগের অ্যাকাউন্টে Login করুন";

  $("authMessage").textContent = "";
  $("authModal").classList.remove("hidden");
}

function closeAuth() {
  $("authModal")?.classList.add("hidden");
}

async function authSubmit(event) {
  event.preventDefault();

  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;

  let result;

  if (authMode === "login") {
    result = await sb.auth.signInWithPassword({ email, password });
  } else {
    result = await sb.auth.signUp({ email, password });
  }

  if (result.error) {
    $("authMessage").textContent = result.error.message;
    return;
  }

  if (authMode === "register" && !result.data?.session) {
    $("authMessage").textContent =
      "Account তৈরি হয়েছে। Email confirmation চালু থাকলে আগে email verify করে Login করো।";
    return;
  }

  closeAuth();
  await updateAuth();
  toast("Success");
  route();
}

async function logout() {
  const { error } = await sb.auth.signOut();

  if (error) {
    toast(error.message);
    return;
  }

  currentUser = null;
  currentMyStore = null;
  followedStores = [];

  updateAccount();
  closeMenu();
  go("home");
  toast("Logged out");
}

/* ---------------- STORES + PRODUCTS ---------------- */

async function loadStores() {
  if (!sb) return;

  const { data, error } = await sb
    .from("stores")
    .select(`
      id,
      name,
      slug,
      logo_url,
      cover_url,
      description,
      phone,
      address,
      is_active,
      is_approved,
      owner_id,
      created_at
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

async function loadProducts() {
  if (!sb) return;

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
      categories(name),
      stores(id,name,slug,is_active,is_approved)
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

  products = (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    description: p.description || "",
    stock: Number(p.stock || 0),
    category: p.categories?.name || "Others",
    store: p.stores?.name || "Unknown Store",
    storeSlug: p.stores?.slug || "",
    storeId: p.store_id,
    image: p.image_url || null
  }));

  renderProducts(currentCategory, $("searchInput")?.value || "");
}

function storeHTML(store) {
  return `
    <div class="store-result">
      <div class="avatar">
        ${store.logo_url
          ? `<img class="avatar" src="${esc(store.logo_url)}" alt="">`
          : ""}
      </div>

      <div class="store-result-info">
        <strong>${esc(store.name)}</strong>
        <span class="store-meta">@${esc(store.slug)}</span>
      </div>

      <button class="view-store secondary" data-id="${esc(store.id)}">
        View Store
      </button>
    </div>
  `;
}

function renderProducts(category = "All", query = "") {
  currentCategory = category;

  const q = String(query || "").trim().toLowerCase();
  const clean = q.replace(/^@/, "");

  const productList = products.filter((p) => {
    const categoryOK =
      category === "All" || p.category === category;

    const text = [
      p.name,
      p.store,
      p.storeSlug,
      p.category,
      p.description
    ].join(" ").toLowerCase();

    return categoryOK && (!q || text.includes(q));
  });

  const storeList = q
    ? stores
        .filter(
          (s) =>
            String(s.name).toLowerCase().includes(q) ||
            String(s.slug).toLowerCase().includes(clean)
        )
        .slice(0, 8)
    : [];

  const box = $("products");
  if (!box) return;

  $("productCount").textContent =
    `${productList.length} products`;

  if (!productList.length && !storeList.length) {
    box.innerHTML =
      '<div class="empty">কোনো Product বা Store পাওয়া যায়নি।</div>';
    return;
  }

  box.innerHTML =
    (storeList.length
      ? `
        <div class="store-search-results">
          <h2>Stores</h2>
          ${storeList.map(storeHTML).join("")}
        </div>
      `
      : "") +
    productList
      .map(
        (p) => `
          <article class="product-card" data-id="${esc(p.id)}">
            ${
              p.image
                ? `<img class="product-image" src="${esc(p.image)}" alt="">`
                : `<div class="product-image"></div>`
            }

            <div class="product-info">
              <div class="product-name">${esc(p.name)}</div>
              <div class="price">${money(p.price)}</div>
              <div class="store-name">${esc(p.store)}</div>
            </div>
          </article>
        `
      )
      .join("");

  box.querySelectorAll(".product-card").forEach((card) => {
    card.onclick = () => openProduct(card.dataset.id);
  });

  box.querySelectorAll(".view-store").forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();

      const store = stores.find(
        (s) => String(s.id) === String(button.dataset.id)
      );

      if (!store) return;

      $("searchInput").value = `@${store.slug}`;
      renderProducts("All", `@${store.slug}`);
    };
  });
}

function openProduct(id) {
  const product = products.find(
    (p) => String(p.id) === String(id)
  );

  if (!product) return;

  $("productDetailContent").innerHTML = `
    <button class="secondary" onclick="go('home')">
      ← Back
    </button>

    <div class="detail">
      ${
        product.image
          ? `<img src="${esc(product.image)}" alt="">`
          : ""
      }

      <div class="detail-body">
        <h1>${esc(product.name)}</h1>
        <h2>${money(product.price)}</h2>
        <p><b>Store:</b> ${esc(product.store)}</p>
        <p><b>Stock:</b> ${product.stock}</p>
        <p>${esc(product.description)}</p>

        <button
          class="primary"
          onclick="toast('Order system পরের ধাপে যোগ করা যাবে')"
        >
          Buy / Order
        </button>
      </div>
    </div>
  `;

  go("product-detail");
}

/* ---------------- CATEGORIES ---------------- */

async function loadCategories() {
  if (!sb) return;

  const { data, error } = await sb
    .from("categories")
    .select("id,name")
    .order("name");

  categories = error
    ? ["All"]
    : ["All", ...(data || []).map((x) => x.name)];

  renderCategories();
  populateCategory();
}

function renderCategories() {
  const box = $("categories");
  if (!box) return;

  box.innerHTML = categories
    .map(
      (name) => `
        <button
          class="category ${name === currentCategory ? "active" : ""}"
          data-cat="${esc(name)}"
        >
          ${esc(name)}
        </button>
      `
    )
    .join("");

  box.querySelectorAll(".category").forEach((button) => {
    button.onclick = () => {
      currentCategory = button.dataset.cat;
      renderCategories();
      renderProducts(
        currentCategory,
        $("searchInput")?.value || ""
      );
    };
  });
}

function populateCategory() {
  const select = $("productCategory");
  if (!select) return;

  select.innerHTML = categories
    .filter((x) => x !== "All")
    .map((x) => `<option value="${esc(x)}">${esc(x)}</option>`)
    .join("");
}

/* ---------------- STORE CREATION / EDIT ---------------- */

function openStore() {
  if (!currentUser) {
    openAuth("login");
    return;
  }

  $("storeMessage").textContent = "";
  $("storeModal").classList.remove("hidden");
}

function closeStore() {
  $("storeModal")?.classList.add("hidden");
}

async function createStore(event) {
  event.preventDefault();

  if (!currentUser) {
    openAuth("login");
    return;
  }

  const name = $("storeName").value.trim();

  if (!name) {
    $("storeMessage").textContent = "Store name দাও।";
    return;
  }

  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const slug =
    `${base || "store"}-${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await sb
    .from("stores")
    .insert({
      owner_id: currentUser.id,
      name,
      slug,
      description: $("storeDescription").value.trim() || null,
      phone: $("storePhone").value.trim() || null,
      address: $("storeAddress").value.trim() || null,
      logo_url: $("storeLogoUrl").value.trim() || null,
      cover_url: $("storeCoverUrl").value.trim() || null,
      is_active: true,
      is_approved: false
    })
    .select()
    .single();

  if (error) {
    $("storeMessage").textContent = error.message;
    return;
  }

  currentMyStore = data;
  closeStore();
  updateAccount();
  await loadStores();
  await renderMyStore();
  toast("Store created — approval pending");
}

/* ---------------- PRODUCT ADD / EDIT ---------------- */

async function addProduct(event) {
  event.preventDefault();

  if (!currentUser) {
    openAuth("login");
    return;
  }

  if (!currentMyStore) {
    openStore();
    return;
  }

  const categoryName = $("productCategory").value;

  const { data: category, error: categoryError } = await sb
    .from("categories")
    .select("id")
    .eq("name", categoryName)
    .maybeSingle();

  if (categoryError || !category) {
    $("productMsg").textContent =
      categoryError?.message || "Category পাওয়া যায়নি।";
    return;
  }

  const payload = {
    name: $("productName").value.trim(),
    price: Number($("productPrice").value),
    description: $("productDescription").value.trim() || null,
    stock: Number($("productStock").value),
    category_id: category.id,
    store_id: currentMyStore.id,
    const imageFile =
  $("productImageFile")?.files?.[0] || null;

const imageUrl =
  await uploadImage(imageFile, "products");
    is_active: true,
    is_approved: false
  };

  const { error } = await sb
    .from("products")
    .insert(payload);

  if (error) {
    $("productMsg").textContent = error.message;
    return;
  }

  $("productForm").reset();
  $("productStock").value = 1;
  $("productMsg").textContent =
    "Product added — approval pending.";

  await loadProducts();
  await sellerProducts();
  toast("Product added");
}

/* ---------------- FOLLOWING ---------------- */

async function loadFollowing() {
  followedStores = [];

  if (!currentUser) return;

  const { data, error } = await sb
    .from("followed_stores")
    .select(
      "store_id,stores(id,name,slug,logo_url,description)"
    )
    .eq("user_id", currentUser.id);

  if (!error) {
    followedStores = (data || [])
      .map((x) => x.stores)
      .filter(Boolean);
  } else {
    console.error("Following error:", error);
  }
}

function renderFollowing() {
  const box = $("followingList");
  if (!box) return;

  if (!currentUser) {
    box.innerHTML =
      '<div class="empty">Following দেখতে Login করো।</div>';
    return;
  }

  if (!followedStores.length) {
    box.innerHTML =
      '<div class="empty">এখনো কোনো Store follow করোনি।</div>';
    return;
  }

  box.innerHTML = followedStores
    .map(
      (store) => `
        <div class="store-card">
          <div class="avatar">
            ${
              store.logo_url
                ? `<img class="avatar" src="${esc(store.logo_url)}" alt="">`
                : ""
            }
          </div>

          <div>
            <b>${esc(store.name)}</b><br>
            <span class="store-meta">@${esc(store.slug)}</span>
          </div>
        </div>
      `
    )
    .join("");
}

/* ---------------- MY STORE ---------------- */

async function renderMyStore() {
  updateAccount();

  const box = $("myStoreContent");
  const manager = $("storeManagerCard");

  if (!box || !manager) return;

  if (!currentUser) {
    box.innerHTML =
      '<div class="empty">My Store ব্যবহার করতে Login করো।</div>';
    manager.classList.add("hidden");
    return;
  }

  if (!currentMyStore) {
    box.innerHTML =
      '<div class="empty">তোমার Store নেই। Create Store চাপো।</div>';
    manager.classList.add("hidden");
    return;
  }

  const store = currentMyStore;

  box.innerHTML = `
    <div class="card store-profile-card">
      ${
        store.cover_url
          ? `<img class="store-cover" src="${esc(store.cover_url)}" alt="">`
          : ""
      }

      <div class="store-profile-row">
        <div class="avatar large-avatar">
          ${
            store.logo_url
              ? `<img class="avatar large-avatar" src="${esc(store.logo_url)}" alt="">`
              : ""
          }
        </div>

        <div>
          <h2>${esc(store.name)}</h2>
          <p>@${esc(store.slug)}</p>
          <small>
            ${store.is_approved ? "Approved" : "Pending approval"}
          </small>
        </div>
      </div>

      <p>${esc(store.description || "No description")}</p>
    </div>
  `;

  manager.classList.remove("hidden");

  await sellerProducts();
  await sellerOrders();
  sellerSettings();
}

/* ---------------- SELLER PRODUCT MANAGEMENT ---------------- */

async function sellerProducts() {
  const box = $("sellerProductsTab");
  if (!box || !currentMyStore) return;

  const { data, error } = await sb
    .from("products")
    .select(`
      id,
      name,
      price,
      stock,
      description,
      image_url,
      is_approved,
      is_active,
      category_id,
      categories(name)
    `)
    .eq("store_id", currentMyStore.id)
    .order("created_at", { ascending: false });

  if (error) {
    box.innerHTML = `
      <div class="empty">${esc(error.message)}</div>
    `;
    return;
  }

  if (!data?.length) {
    box.innerHTML =
      '<div class="empty">কোনো product নেই।</div>';
    return;
  }

  box.innerHTML = data
    .map(
      (product) => `
        <div class="manage ${product.is_active ? "" : "inactive-product"}">
          ${
            product.image_url
              ? `<img src="${esc(product.image_url)}" alt="">`
              : `<div class="manage-placeholder"></div>`
          }

          <div class="manage-info">
            <b>${esc(product.name)}</b><br>
            <small>
              ${money(product.price)}
              · Stock ${Number(product.stock || 0)}
              · ${product.is_approved ? "Approved" : "Pending"}
              ${product.is_active ? "" : " · Hidden"}
            </small>
          </div>

          <button
            class="small edit"
            data-id="${esc(product.id)}"
          >
            Edit
          </button>

          <button
            class="small del"
            data-id="${esc(product.id)}"
          >
            Delete
          </button>
        </div>
      `
    )
    .join("");

  box.querySelectorAll(".edit").forEach((button) => {
    button.onclick = () => editProduct(button.dataset.id);
  });

  box.querySelectorAll(".del").forEach((button) => {
    button.onclick = () => deleteProduct(button.dataset.id);
  });
}

function openProductEditor(product) {
  editingProductId = product.id;

  $("editProductId").value = product.id;
  $("editProductName").value = product.name || "";
  $("editProductPrice").value = product.price ?? "";
  $("editProductStock").value = product.stock ?? 0;
  $("editProductDescription").value = product.description || "";
  $("editProductImageUrl").value = product.image_url || "";

  const category = product.categories?.name || "";
  $("editProductCategory").innerHTML = categories
    .filter((x) => x !== "All")
    .map(
      (x) =>
        `<option value="${esc(x)}" ${x === category ? "selected" : ""}>
          ${esc(x)}
        </option>`
    )
    .join("");

  $("editProductMessage").textContent = "";
  $("productEditModal").classList.remove("hidden");
}

function closeProductEditor() {
  editingProductId = null;
  $("productEditModal")?.classList.add("hidden");
}

async function editProduct(id) {
  if (!currentMyStore) return;

  const { data, error } = await sb
    .from("products")
    .select(`
      *,
      categories(name)
    `)
    .eq("id", id)
    .eq("store_id", currentMyStore.id)
    .single();

  if (error) {
    toast(error.message);
    return;
  }

  openProductEditor(data);
}

async function saveProductEdit(event) {
  event.preventDefault();

  if (!editingProductId || !currentMyStore) return;

  const categoryName = $("editProductCategory").value;

  const { data: category, error: categoryError } = await sb
    .from("categories")
    .select("id")
    .eq("name", categoryName)
    .maybeSingle();

  if (categoryError || !category) {
    $("editProductMessage").textContent =
      categoryError?.message || "Category পাওয়া যায়নি।";
    return;
  }

  const updates = {
    name: $("editProductName").value.trim(),
    price: Number($("editProductPrice").value),
    stock: Number($("editProductStock").value),
    description: $("editProductDescription").value.trim() || null,
    image_url: $("editProductImageUrl").value.trim() || null,
    category_id: category.id
  };

  const { error } = await sb
    .from("products")
    .update(updates)
    .eq("id", editingProductId)
    .eq("store_id", currentMyStore.id);

  if (error) {
    $("editProductMessage").textContent = error.message;
    return;
  }

  closeProductEditor();
  await loadProducts();
  await sellerProducts();
  toast("Product updated");
}

async function deleteProduct(id) {
  if (!currentMyStore) return;

  if (!confirm("এই product remove করতে চাও?")) return;

  const { error } = await sb
    .from("products")
    .update({ is_active: false })
    .eq("id", id)
    .eq("store_id", currentMyStore.id);

  if (error) {
    toast(error.message);
    return;
  }

  await loadProducts();
  await sellerProducts();
  toast("Product removed");
}

/* ---------------- SELLER ORDERS ---------------- */

async function sellerOrders() {
  const box = $("sellerOrdersTab");
  if (!box || !currentMyStore) return;

  const { data, error } = await sb
    .from("order_items")
    .select(`
      id,
      order_id,
      quantity,
      price,
      products!inner(id,name,store_id),
      orders(id,status,created_at,total_amount)
    `)
    .eq("products.store_id", currentMyStore.id)
    .order("created_at", { ascending: false });

  if (error) {
    box.innerHTML = `
      <div class="empty">${esc(error.message)}</div>
    `;
    return;
  }

  if (!data?.length) {
    box.innerHTML =
      '<div class="empty">কোনো order নেই।</div>';
    return;
  }

  box.innerHTML = data
    .map(
      (item) => `
        <div class="card">
          <b>Order #${esc(item.order_id)}</b>
          <p>
            ${esc(item.products?.name || "Product")}
            × ${Number(item.quantity || 0)}
          </p>
          <small>
            Status: ${esc(item.orders?.status || "pending")}
          </small>
        </div>
      `
    )
    .join("");
}

/* ---------------- STORE SETTINGS ---------------- */

function sellerSettings() {
  const box = $("sellerSettingsTab");
  if (!box || !currentMyStore) return;

  const store = currentMyStore;

  box.innerHTML = `
    <div class="card">
      <label>
        Store name
        <input id="setName" value="${esc(store.name)}">
      </label>

      <label>
        Description
        <textarea id="setDesc">${esc(store.description || "")}</textarea>
      </label>

      <label>
        Phone
        <input id="setPhone" value="${esc(store.phone || "")}">
      </label>

      <label>
        Address
        <input id="setAddress" value="${esc(store.address || "")}">
      </label>

      <label>
        Logo URL
        <input id="setLogo" type="url" value="${esc(store.logo_url || "")}">
      </label>

      <label>
        Cover URL
        <input id="setCover" type="url" value="${esc(store.cover_url || "")}">
      </label>

      <button id="saveStore" class="primary">
        Save Store
      </button>

      <p id="storeSettingsMessage"></p>
    </div>
  `;

  $("saveStore").onclick = saveStoreSettings;
}

async function saveStoreSettings() {
  const updates = {
    name: $("setName").value.trim(),
    description: $("setDesc").value.trim() || null,
    phone: $("setPhone").value.trim() || null,
    address: $("setAddress").value.trim() || null,
    logo_url: $("setLogo").value.trim() || null,
    cover_url: $("setCover").value.trim() || null
  };

  const { data, error } = await sb
    .from("stores")
    .update(updates)
    .eq("id", currentMyStore.id)
    .eq("owner_id", currentUser.id)
    .select()
    .single();

  if (error) {
    $("storeSettingsMessage").textContent = error.message;
    return;
  }

  currentMyStore = data;
  await loadStores();
  await renderMyStore();
  toast("Store updated");
}

/* ---------------- UI EVENTS ---------------- */

function init() {
  /* IMPORTANT: define every handler before using it. */

  document.querySelectorAll("[data-route]").forEach((el) => {
    el.onclick = () => go(el.dataset.route);
  });

  $("menuBtn")?.addEventListener("click", openMenu);
  $("closeMenuBtn")?.addEventListener("click", closeMenu);
  $("menuOverlay")?.addEventListener("click", closeMenu);

  $("loginBtn")?.addEventListener("click", () => openAuth("login"));
  $("logoutBtn")?.addEventListener("click", logout);
  $("createStoreBtn")?.addEventListener("click", openStore);

  $("closeAuthBtn")?.addEventListener("click", closeAuth);
  $("authSwitchBtn")?.addEventListener(
    "click",
    () => openAuth(authMode === "login" ? "register" : "login")
  );
  $("authForm")?.addEventListener("submit", authSubmit);

  $("closeStoreBtn")?.addEventListener("click", closeStore);
  $("storeForm")?.addEventListener("submit", createStore);

  $("productForm")?.addEventListener("submit", addProduct);

  $("closeProductEditBtn")?.addEventListener(
    "click",
    closeProductEditor
  );

  $("productEditForm")?.addEventListener(
    "submit",
    saveProductEdit
  );

  $("searchInput")?.addEventListener("input", () => {
    renderProducts(
      currentCategory,
      $("searchInput").value || ""
    );
  });

  $("searchBtn")?.addEventListener("click", () => {
    go("home");
    renderProducts(
      currentCategory,
      $("searchInput")?.value || ""
    );
  });

  $("headerSearchBtn")?.addEventListener("click", () => {
    go("home");
    setTimeout(() => $("searchInput")?.focus(), 50);
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.onclick = () => {
      document.querySelectorAll(".tab").forEach((t) =>
        t.classList.remove("active")
      );

      tab.classList.add("active");

      const tabName = tab.dataset.tab;

      $("sellerProductsTab")?.classList.toggle(
        "hidden",
        tabName !== "products"
      );

      $("sellerOrdersTab")?.classList.toggle(
        "hidden",
        tabName !== "orders"
      );

      $("sellerSettingsTab")?.classList.toggle(
        "hidden",
        tabName !== "settings"
      );
    };
  });

  $("authModal")?.querySelector(".shade")?.addEventListener(
    "click",
    closeAuth
  );

  $("storeModal")?.querySelector(".shade")?.addEventListener(
    "click",
    closeStore
  );

  $("productEditModal")?.querySelector(".shade")?.addEventListener(
    "click",
    closeProductEditor
  );

  renderCategories();
  renderProducts();
  route();

  (async () => {
    await updateAuth();
    await loadCategories();
    await loadStores();
    await loadProducts();
    route();
  })();
}

if (sb?.auth) {
  sb.auth.onAuthStateChange(async () => {
    await updateAuth();

    if (location.hash === "#my-store") {
      await renderMyStore();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);

window.go = go;
window.toast = toast;
window.closeMenu = closeMenu;
window.closeAuth = closeAuth;
window.closeStore = closeStore;
window.closeProductEditor = closeProductEditor;
