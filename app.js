/* =========================================================
   BUYHAAT — SUPABASE CONNECTED APP
   Products + Categories + Stores
   Seller Store Management
   Products + Orders
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

const sb = supabaseClient;


/* =========================================================
   DOM HELPER
   ========================================================= */

const $ = id => document.getElementById(id);


/* =========================================================
   DATA
   ========================================================= */

let products = [];
let categories = ["All"];
let followedStores = [];

let currentMyStore = null;
let currentUser = null;


/* =========================================================
   HELPERS
   ========================================================= */

function money(n) {

  return "৳" +
    Number(n || 0).toLocaleString("en-BD");

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


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================================================
   AUTH USER
   ========================================================= */

async function getCurrentUser() {

  const {
    data: { user },
    error
  } = await sb.auth.getUser();

  if (error) {

    console.error(
      "Get user error:",
      error
    );

    return null;

  }

  currentUser =
    user || null;

  return currentUser;

}


/* =========================================================
   IMAGE UPLOAD
   ========================================================= */

async function uploadImage(
  file,
  folder
) {

  if (!file) return null;


  if (!file.type.startsWith("image/")) {

    throw new Error(
      "শুধু image file upload করা যাবে।"
    );

  }


  const maxSize =
    5 * 1024 * 1024;


  if (file.size > maxSize) {

    throw new Error(
      "ছবির size সর্বোচ্চ 5MB হতে হবে।"
    );

  }


  const user =
    currentUser ||
    await getCurrentUser();


  if (!user) {

    throw new Error(
      "আগে Login করুন।"
    );

  }


  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();


  const fileName =
    `${user.id}/${folder}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}.${extension}`;


  const {
    error
  } = await sb.storage
    .from("store-images")
    .upload(
      fileName,
      file,
      {
        cacheControl: "3600",
        upsert: false
      }
    );


  if (error) {

    console.error(
      "Image upload error:",
      error
    );

    throw error;

  }


  const {
    data
  } = sb.storage
    .from("store-images")
    .getPublicUrl(
      fileName
    );


  return data.publicUrl;

}


/* =========================================================
   LOAD CATEGORIES
   ========================================================= */

async function loadCategories() {

  const {
    data,
    error
  } = await sb
    .from("categories")
    .select("*")
    .order("name");


  if (error) {

    console.error(
      "Category error:",
      error
    );

    showToast(
      "Categories load করা যায়নি"
    );

    return;

  }


  categories = [
    "All",
    ...(data || []).map(
      c => c.name
    )
  ];


  renderCategories();

}


/* =========================================================
   LOAD PRODUCTS
   ========================================================= */

async function loadProducts() {

  const {
    data,
    error
  } = await sb
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
    .eq(
      "is_active",
      true
    )
    .eq(
      "is_approved",
      true
    )
    .order(
      "created_at",
      {
        ascending: false
      }
    );


  if (error) {

    console.error(
      "Product error:",
      error
    );

    showToast(
      "Products load করা যায়নি"
    );

    return;

  }


  products =
    (data || [])
      .filter(
        p =>
          p.stores &&
          p.stores.is_active &&
          p.stores.is_approved
      )
      .map(
        p => ({

          id:
            p.id,

          name:
            p.name,

          price:
            Number(p.price),

          category:
            p.categories?.name ||
            "Others",

          store:
            p.stores?.name ||
            "Unknown Store",

          storeId:
            p.store_id,

          description:
            p.description ||
            "",

          stock:
            p.stock ||
            0,

          image:
            p.image_url ||
            null

        })
      );


  renderProducts(
    document
      .querySelector(
        ".category.active"
      )
      ?.dataset.category ||
      "All",

    $("searchInput")
      ?.value ||
      ""
  );

}


/* =========================================================
   RENDER CATEGORIES
   ========================================================= */

function renderCategories() {

  const container =
    $("categories");

  if (!container) return;


  container.innerHTML =
    categories
      .map(
        (c, i) =>

          `<button
            class="category ${
              i === 0
                ? "active"
                : ""
            }"
            data-category="${escapeHTML(c)}">

            ${escapeHTML(c)}

          </button>`
      )
      .join("");


  document
    .querySelectorAll(
      ".category"
    )
    .forEach(
      btn => {

        btn.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(
                ".category"
              )
              .forEach(
                x =>
                  x.classList.remove(
                    "active"
                  )
              );


            btn.classList.add(
              "active"
            );


            renderProducts(
              btn.dataset.category,
              $("searchInput")
                ?.value ||
                ""
            );

          }
        );

      }
    );

}


/* =========================================================
   RENDER PRODUCTS
   ========================================================= */

function renderProducts(
  category = "All",
  query = ""
) {

  const container =
    $("products");

  if (!container) return;


  let list =
    products.filter(
      p =>
        category === "All" ||
        p.category === category
    );


  const q =
    query
      .trim()
      .toLowerCase();


  if (q) {

    list =
      list.filter(
        p =>
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

    $("productCount")
      .textContent =
      list.length +
      " products";

  }


  container.innerHTML =
    list.length

      ? list
          .map(
            p => `

              <article
                class="product-card"
                data-product="${p.id}">

                <div class="product-image">

                  ${
                    p.image

                      ? `
                        <img
                          src="${escapeHTML(
                            p.image
                          )}"
                          alt="${escapeHTML(
                            p.name
                          )}">
                      `

                      : "🛍️"
                  }

                </div>


                <div class="product-info">

                  <div class="product-name">

                    ${escapeHTML(
                      p.name
                    )}

                  </div>


                  <div class="price">

                    ${money(
                      p.price
                    )}

                  </div>


                  <div class="store-name">

                    ${escapeHTML(
                      p.store
                    )}

                  </div>

                </div>

              </article>

            `
          )
          .join("")

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
    .querySelectorAll(
      "[data-product]"
    )
    .forEach(
      card => {

        card.addEventListener(
          "click",
          () => {

            openProduct(
              card.dataset.product
            );

          }
        );

      }
    );

}


/* =========================================================
   PRODUCT DETAIL
   ========================================================= */

function openProduct(id) {

  const p =
    products.find(
      x =>
        String(x.id) ===
        String(id)
    );


  if (!p) {

    showToast(
      "Product পাওয়া যায়নি"
    );

    return;

  }


  location.hash =
    "product/" +
    p.id;


  const detail =
    $("product-detail");


  if (!detail) return;


  detail.innerHTML = `

    <div class="detail">

      <button
        class="back-btn"
        onclick="location.hash='home'">

        ← Back to Home

      </button>


      <div class="detail-card">

        <div class="detail-image">

          ${
            p.image

              ? `
                <img
                  src="${escapeHTML(
                    p.image
                  )}"
                  alt="${escapeHTML(
                    p.name
                  )}">
              `

              : "🛍️"
          }

        </div>


        <div class="detail-body">

          <div class="eyebrow">

            ${escapeHTML(
              p.category
            ).toUpperCase()}

          </div>


          <h1>

            ${escapeHTML(
              p.name
            )}

          </h1>


          <div class="store-name">

            Store:
            ${escapeHTML(
              p.store
            )}

          </div>


          <div class="detail-price">

            ${money(
              p.price
            )}

          </div>


          <p class="detail-desc">

            ${escapeHTML(
              p.description
            )}

          </p>


          <p>

            Stock:
            <strong>
              ${p.stock}
            </strong>

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


  showPage(
    "product-detail"
  );

}


/* =========================================================
   ORDER START
   ========================================================= */

function startOrder(id) {

  const p =
    products.find(
      x =>
        String(x.id) ===
        String(id)
    );


  if (!p) return;


  if (p.stock <= 0) {

    showToast(
      "এই product বর্তমানে stock out"
    );

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

  const container =
    $("followingList");

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
    followedStores
      .map(
        store => `

          <div class="store-card">

            <div class="store-avatar">

              ${escapeHTML(
                store.charAt(0)
              )}

            </div>


            <div class="store-meta">

              <h3>
                ${escapeHTML(
                  store
                )}
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

        `
      )
      .join("");

}


/* =========================================================
   PAGE ROUTING
   ========================================================= */

function showPage(page) {

  document
    .querySelectorAll(".page")
    .forEach(
      p =>
        p.classList.remove(
          "active"
        )
    );


  const target =
    $(page);


  if (!target) {

    if (
      page ===
      "manage-products"
    ) {

      createManageProductsPage();

      const newTarget =
        $("manage-products");


      if (newTarget) {

        newTarget.classList.add(
          "active"
        );

        loadManageProducts();

      }

      return;

    }


    return;

  }


  target.classList.add(
    "active"
  );


  if (
    page ===
    "my-store"
  ) {

    loadMyStore();

  }


  if (
    page ===
    "manage-products"
  ) {

    loadManageProducts();

  }


  document
    .querySelectorAll(
      ".bottom-nav a"
    )
    .forEach(
      a =>
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
    location.hash.replace(
      "#",
      ""
    );


  if (
    hash.startsWith(
      "product/"
    )
  ) {

    openProduct(
      hash.split("/")[1]
    );

    return;

  }


  const page =
    hash ||
    "home";


  const valid = [

    "home",

    "following",

    "add-product",

    "chat",

    "my-store",

    "manage-products",

    "product-detail"

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

$("searchInput")
  ?.addEventListener(
    "input",
    () => {

      const active =
        document.querySelector(
          ".category.active"
        );


      renderProducts(

        active?.dataset.category ||
        "All",

        $("searchInput")
          .value ||
        ""

      );

    }
  );


$("searchBtn")
  ?.addEventListener(
    "click",
    () => {

      $("searchInput")
        ?.focus();


      renderProducts(
        "All",
        $("searchInput")
          ?.value ||
        ""
      );

    }
  );


/* =========================================================
   CREATE STORE
   ========================================================= */

$("createStoreBtn")
  ?.addEventListener(
    "click",
    async () => {

      const user =
        await getCurrentUser();


      if (!user) {

        showToast(
          "আগে Login করুন"
        );

        return;

      }


      const {
        data: existingStore,
        error: existingError
      } = await sb
        .from("stores")
        .select("id")
        .eq(
          "owner_id",
          user.id
        )
        .maybeSingle();


      if (existingError) {

        console.error(
          existingError
        );

        showToast(
          "Store check করা যায়নি"
        );

        return;

      }


      if (existingStore) {

        showToast(
          "আপনার ইতিমধ্যে একটি Store আছে"
        );

        location.hash =
          "my-store";

        return;

      }


      const existing =
        $("createStoreModal");


      if (existing) {

        existing.classList.add(
          "show"
        );

        return;

      }


      const modal =
        document.createElement(
          "div"
        );


      modal.id =
        "createStoreModal";

      modal.className =
        "store-modal";


      modal.innerHTML = `

        <div class="store-modal-card">

          <button
            type="button"
            class="store-modal-close"
            id="closeCreateStore">

            ×

          </button>


          <h2>
            Create Your Store
          </h2>


          <p class="store-modal-subtitle">
            আপনার BuyHaat store তৈরি করুন
          </p>


          <form
            id="createStoreForm">


            <label>

              Store Name

              <input
                type="text"
                id="storeName"
                placeholder="যেমন: Limon Fashion"
                required
                maxlength="100">

            </label>


            <label>

              Store Logo

              <input
                type="file"
                id="storeLogoFile"
                accept="image/*">

            </label>


            <label>

              Cover Image

              <input
                type="file"
                id="storeCoverFile"
                accept="image/*">

            </label>


            <label>

              Description

              <textarea
                id="storeDescription"
                placeholder="আপনার store সম্পর্কে লিখুন"
                rows="3"
                maxlength="500"></textarea>

            </label>


            <label>

              Phone

              <input
                type="tel"
                id="storePhone"
                placeholder="01XXXXXXXXX"
                maxlength="20">

            </label>


            <label>

              Address

              <textarea
                id="storeAddress"
                placeholder="আপনার দোকান/ব্যবসার ঠিকানা"
                rows="2"
                maxlength="300"></textarea>

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


      document.body.appendChild(
        modal
      );


      modal.classList.add(
        "show"
      );


      $("closeCreateStore")
        ?.addEventListener(
          "click",
          () => modal.remove()
        );


      modal.addEventListener(
        "click",
        e => {

          if (
            e.target === modal
          ) {

            modal.remove();

          }

        }
      );


      $("createStoreForm")
        ?.addEventListener(
          "submit",
          async e => {

            e.preventDefault();


            const saveBtn =
              $("saveStoreBtn");

            const message =
              $("storeFormMessage");


            const name =
              $("storeName")
                .value
                .trim();


            const description =
              $("storeDescription")
                .value
                .trim();


            const phone =
              $("storePhone")
                .value
                .trim();


            const address =
              $("storeAddress")
                .value
                .trim();


            const logoFile =
              $("storeLogoFile")
                .files[0];


            const coverFile =
              $("storeCoverFile")
                .files[0];


            if (!name) {

              message.textContent =
                "Store name দিন।";

              return;

            }


            saveBtn.disabled =
              true;

            saveBtn.textContent =
              "Creating...";


            try {

              let logoUrl =
                null;

              let coverUrl =
                null;


              if (logoFile) {

                logoUrl =
                  await uploadImage(
                    logoFile,
                    "store-logo"
                  );

              }


              if (coverFile) {

                coverUrl =
                  await uploadImage(
                    coverFile,
                    "store-cover"
                  );

              }


              const baseSlug =
                name
                  .toLowerCase()
                  .trim()
                  .replace(
                    /[^a-z0-9]+/g,
                    "-"
                  )
                  .replace(
                    /^-+|-+$/g,
                    ""
                  );


              const slug =
                `${baseSlug || "store"}-${Math.random()
                  .toString(36)
                  .substring(2, 8)}`;


              const {
                data,
                error
              } = await sb
                .from("stores")
                .insert({

                  owner_id:
                    user.id,

                  name,

                  slug,

                  description:
                    description ||
                    null,

                  logo_url:
                    logoUrl,

                  cover_url:
                    coverUrl,

                  phone:
                    phone ||
                    null,

                  address:
                    address ||
                    null,

                  is_active:
                    true,

                  is_approved:
                    false

                })
                .select()
                .single();


              if (error) {

                throw error;

              }


              currentMyStore =
                data;


              showToast(
                "Store তৈরি হয়েছে"
              );


              modal.remove();


              location.hash =
                "my-store";


              await updateAuthState();


              await loadMyStore();


            } catch (error) {

              console.error(
                "Create store error:",
                error
              );


              message.textContent =
                error.message ||
                "Store তৈরি করা যায়নি।";

            }


            saveBtn.disabled =
              false;

            saveBtn.textContent =
              "Create Store";

          }
        );

    }
  );


/* =========================================================
   MY STORE
   ========================================================= */

async function loadMyStore() {

  const container =
    $("myStoreContent");


  if (!container) return;


  container.innerHTML = `

    <div class="empty-card">

      <p>
        Store loading...
      </p>

    </div>

  `;


  const user =
    await getCurrentUser();


  if (!user) {

    container.innerHTML = `

      <div class="empty-card">

        <h3>
          Login required
        </h3>

        <p>
          নিজের Store দেখতে আগে Login করুন।
        </p>

      </div>

    `;

    return;

  }


  const {
    data: store,
    error
  } = await sb
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
    .eq(
      "owner_id",
      user.id
    )
    .maybeSingle();


  if (error) {

    console.error(
      "My Store error:",
      error
    );


    container.innerHTML = `

      <div class="empty-card">

        <h3>
          Store load করা যায়নি
        </h3>

        <p>
          ${escapeHTML(
            error.message
          )}
        </p>

      </div>

    `;

    return;

  }


  if (!store) {

    currentMyStore =
      null;


    if ($("createStoreBtn")) {

      $("createStoreBtn")
        .style.display =
        "inline-flex";

    }


    container.innerHTML = `

      <div class="empty-card">

        <h3>
          আপনার কোনো Store নেই
        </h3>

        <p>
          Create Store থেকে আপনার প্রথম Store তৈরি করুন।
        </p>

      </div>

    `;

    return;

  }


  currentMyStore =
    store;


  if ($("createStoreBtn")) {

    $("createStoreBtn")
      .style.display =
      "none";

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
                url('${escapeHTML(
                  store.cover_url
                )}');
              ">
            </div>

          `

          : `

            <div
              class="my-store-cover">
            </div>

          `
      }


      <div
        class="my-store-body">


        <div
          class="my-store-header">


          ${
            store.logo_url

              ? `

                <img
                  class="my-store-logo"
                  src="${escapeHTML(
                    store.logo_url
                  )}"
                  alt="Store Logo">

              `

              : `

                <div
                  class="my-store-logo placeholder">

                  ${escapeHTML(
                    store.name
                      .charAt(0)
                      .toUpperCase()
                  )}

                </div>

              `
          }


          <div>

            <h2>
              ${escapeHTML(
                store.name
              )}
            </h2>


            <p>
              @${escapeHTML(
                store.slug
              )}
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

              <p
                class="my-store-description">

                ${escapeHTML(
                  store.description
                )}

              </p>

            `

            : ""
        }


        ${
          store.phone

            ? `

              <p>
                📞
                ${escapeHTML(
                  store.phone
                )}
              </p>

            `

            : ""
        }


        ${
          store.address

            ? `

              <p>
                📍
                ${escapeHTML(
                  store.address
                )}
              </p>

            `

            : ""
        }


        <div
          class="my-store-actions">


          <button
            class="secondary-btn"
            onclick="openEditStore()">

            Edit Store

          </button>


          <button
            class="primary-store-btn"
            onclick="openManageProducts()">

            Manage Products

          </button>


        </div>


      </div>

    </div>

  `;

}


/* =========================================================
   EDIT STORE MODAL
   ========================================================= */

function createEditStoreModal() {

  const old =
    $("editStoreModal");


  if (old) {

    old.remove();

  }


  const modal =
    document.createElement(
      "div"
    );


  modal.id =
    "editStoreModal";

  modal.className =
    "store-modal";


  modal.innerHTML = `

    <div class="store-modal-card">

      <button
        type="button"
        class="store-modal-close"
        id="closeEditStore">

        ×

      </button>


      <h2>
        Edit Store
      </h2>


      <p class="store-modal-subtitle">
        আপনার Store-এর তথ্য পরিবর্তন করুন
      </p>


      <form
        id="editStoreForm">


        <label>

          Store Name

          <input
            type="text"
            id="editStoreName"
            maxlength="100"
            required>

        </label>


        <label>

          Store Logo

          <input
            type="file"
            id="editStoreLogo"
            accept="image/*">

        </label>


        <div
          id="editLogoPreview"
          class="store-image-preview">
        </div>


        <label>

          Cover Image

          <input
            type="file"
            id="editStoreCover"
            accept="image/*">

        </label>


        <div
          id="editCoverPreview"
          class="store-image-preview">
        </div>


        <label>

          Description

          <textarea
            id="editStoreDescription"
            rows="4"
            maxlength="500"></textarea>

        </label>


        <label>

          Phone

          <input
            type="tel"
            id="editStorePhone"
            maxlength="20">

        </label>


        <label>

          Address

          <textarea
            id="editStoreAddress"
            rows="3"
            maxlength="300"></textarea>

        </label>


        <button
          type="submit"
          id="saveStoreChanges"
          class="primary-store-btn">

          Save Changes

        </button>


        <p
          id="editStoreMessage"
          class="store-form-message">
        </p>


      </form>

    </div>

  `;


  document.body.appendChild(
    modal
  );


  modal.classList.add(
    "show"
  );


  $("closeEditStore")
    ?.addEventListener(
      "click",
      () => {

        modal.remove();

      }
    );


  modal.addEventListener(
    "click",
    e => {

      if (
        e.target === modal
      ) {

        modal.remove();

      }

    }
  );


  $("editStoreForm")
    ?.addEventListener(
      "submit",
      submitEditStore
    );


  return modal;

}


/* =========================================================
   OPEN EDIT STORE
   ========================================================= */

async function openEditStore() {

  const user =
    await getCurrentUser();


  if (!user) {

    showToast(
      "আগে Login করুন"
    );

    return;

  }


  if (!currentMyStore) {

    await loadMyStore();

  }


  if (!currentMyStore) {

    showToast(
      "Store পাওয়া যায়নি"
    );

    return;

  }


  const modal =
    createEditStoreModal();


  $("editStoreName").value =
    currentMyStore.name ||
    "";


  $("editStoreDescription").value =
    currentMyStore.description ||
    "";


  $("editStorePhone").value =
    currentMyStore.phone ||
    "";


  $("editStoreAddress").value =
    currentMyStore.address ||
    "";


  if (
    currentMyStore.logo_url
  ) {

    $("editLogoPreview")
      .innerHTML = `

        <img
          src="${escapeHTML(
            currentMyStore.logo_url
          )}"
          alt="Store Logo">

      `;

  }


  if (
    currentMyStore.cover_url
  ) {

    $("editCoverPreview")
      .innerHTML = `

        <img
          src="${escapeHTML(
            currentMyStore.cover_url
          )}"
          alt="Store Cover">

      `;

  }


  modal.classList.add(
    "show"
  );

}


/* =========================================================
   EDIT STORE SUBMIT
   ========================================================= */

async function submitEditStore(e) {

  e.preventDefault();


  if (!currentMyStore) {

    showToast(
      "Store পাওয়া যায়নি"
    );

    return;

  }


  const saveBtn =
    $("saveStoreChanges");

  const message =
    $("editStoreMessage");


  saveBtn.disabled =
    true;

  saveBtn.textContent =
    "Saving...";

  message.textContent =
    "";


  try {

    let logoUrl =
      currentMyStore.logo_url ||
      null;


    let coverUrl =
      currentMyStore.cover_url ||
      null;


    const logoFile =
      $("editStoreLogo")
        ?.files[0];


    const coverFile =
      $("editStoreCover")
        ?.files[0];


    if (logoFile) {

      logoUrl =
        await uploadImage(
          logoFile,
          "store-logo"
        );

    }


    if (coverFile) {

      coverUrl =
        await uploadImage(
          coverFile,
          "store-cover"
        );

    }


    const name =
      $("editStoreName")
        .value
        .trim();


    if (!name) {

      throw new Error(
        "Store name প্রয়োজন।"
      );

    }


    const updates = {

      name,

      description:
        $("editStoreDescription")
          .value
          .trim() ||
        null,

      phone:
        $("editStorePhone")
          .value
          .trim() ||
        null,

      address:
        $("editStoreAddress")
          .value
          .trim() ||
        null,

      logo_url:
        logoUrl,

      cover_url:
        coverUrl,

      updated_at:
        new Date()
          .toISOString()

    };


    const {
      data,
      error
    } = await sb
      .from("stores")
      .update(updates)
      .eq(
        "id",
        currentMyStore.id
      )
      .eq(
        "owner_id",
        currentUser.id
      )
      .select()
      .single();


    if (error) {

      throw error;

    }


    currentMyStore =
      data;


    message.textContent =
      "Store successfully updated।";


    showToast(
      "Store update হয়েছে"
    );


    $("editStoreModal")
      ?.remove();


    await loadMyStore();


  } catch (error) {

    console.error(
      "Edit store error:",
      error
    );


    message.textContent =
      error.message ||
      "Store update করা যায়নি।";

  }


  saveBtn.disabled =
    false;

  saveBtn.textContent =
    "Save Changes";

}


/* =========================================================
   MANAGE PRODUCTS PAGE
   ========================================================= */

function createManageProductsPage() {

  const old =
    $("manage-products");


  if (old) {

    return old;

  }


  const page =
    document.createElement(
      "section"
    );


  page.id =
    "manage-products";

  page.className =
    "page";


  page.innerHTML = `

    <div class="page-title">

      <p class="eyebrow">
        SELLER
      </p>


      <h1>
        Manage Products
      </h1>


      <p>
        আপনার Store-এর products এবং orders পরিচালনা করুন।
      </p>

    </div>


    <div
      class="seller-tabs">


      <button
        class="secondary-btn seller-tab active"
        data-tab="products">

        Products

      </button>


      <button
        class="secondary-btn seller-tab"
        data-tab="orders">

        Orders

      </button>


    </div>


    <div
      id="sellerProductsPanel">
    </div>


    <div
      id="sellerOrdersPanel"
      style="display:none;">
    </div>

  `;


  document
    .querySelector("main")
    ?.appendChild(page);


  page
    .querySelectorAll(
      ".seller-tab"
    )
    .forEach(
      btn => {

        btn.addEventListener(
          "click",
          () => {

            page
              .querySelectorAll(
                ".seller-tab"
              )
              .forEach(
                x =>
                  x.classList.remove(
                    "active"
                  )
              );


            btn.classList.add(
              "active"
            );


            const tab =
              btn.dataset.tab;


            $("sellerProductsPanel")
              .style.display =
              tab === "products"
                ? "block"
                : "none";


            $("sellerOrdersPanel")
              .style.display =
              tab === "orders"
                ? "block"
                : "none";


            if (
              tab ===
              "orders"
            ) {

              loadStoreOrders();

            }

          }
        );

      }
    );


  return page;

}


/* =========================================================
   OPEN MANAGE PRODUCTS
   ========================================================= */

async function openManageProducts() {

  createManageProductsPage();


  location.hash =
    "manage-products";


  await loadManageProducts();

}


/* =========================================================
   LOAD MANAGE PRODUCTS
   ========================================================= */

async function loadManageProducts() {

  if (
    !$("manage-products")
  ) {

    createManageProductsPage();

  }


  const user =
    await getCurrentUser();


  if (!user) {

    $("sellerProductsPanel")
      .innerHTML = `

        <div class="empty-card">

          <h3>
            Login required
          </h3>

          <p>
            Product manage করতে Login করুন।
          </p>

        </div>

      `;

    return;

  }


  const {
    data: store,
    error
  } = await sb
    .from("stores")
    .select("*")
    .eq(
      "owner_id",
      user.id
    )
    .maybeSingle();


  if (error) {

    $("sellerProductsPanel")
      .innerHTML = `

        <div class="empty-card">

          <p>
            ${escapeHTML(
              error.message
            )}
          </p>

        </div>

      `;

    return;

  }


  if (!store) {

    $("sellerProductsPanel")
      .innerHTML = `

        <div class="empty-card">

          <h3>
            আগে Store তৈরি করুন
          </h3>


          <button
            class="primary-btn"
            onclick="location.hash='my-store'">

            My Store

          </button>

        </div>

      `;

    return;

  }


  currentMyStore =
    store;


  const {
    data: storeProducts,
    error: productError
  } = await sb
    .from("products")
    .select(`
      id,
      store_id,
      category_id,
      name,
      slug,
      description,
      price,
      compare_price,
      stock,
      sku,
      image_url,
      is_active,
      is_approved,
      created_at
    `)
    .eq(
      "store_id",
      store.id
    )
    .order(
      "created_at",
      {
        ascending: false
      }
    );


  if (productError) {

    $("sellerProductsPanel")
      .innerHTML = `

        <div class="empty-card">

          <h3>
            Products load করা যায়নি
          </h3>

          <p>
            ${escapeHTML(
              productError.message
            )}
          </p>

        </div>

      `;

    return;

  }


  $("sellerProductsPanel")
    .innerHTML = `

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          margin-bottom:20px;
          flex-wrap:wrap;
        ">


        <h2>
          Your Products
        </h2>


        <button
          class="primary-btn"
          id="addProductBtn">

          + Add Product

        </button>

      </div>


      ${
        storeProducts?.length

          ? storeProducts
              .map(
                product => `

                  <div
                    class="store-card"
                    style="
                      margin-bottom:12px;
                    ">


                    <div
                      class="store-avatar">


                      ${
                        product.image_url

                          ? `

                            <img
                              src="${escapeHTML(
                                product.image_url
                              )}"
                              style="
                                width:100%;
                                height:100%;
                                object-fit:cover;
                                border-radius:inherit;
                              "
                              alt="">

                          `

                          : "📦"

                      }


                    </div>


                    <div
                      class="store-meta"
                      style="
                        flex:1;
                      ">


                      <h3>

                        ${escapeHTML(
                          product.name
                        )}

                      </h3>


                      <p>

                        ${money(
                          product.price
                        )}

                        · Stock:
                        ${product.stock}

                      </p>


                      <p>

                        ${
                          product.is_approved
                            ? "Approved"
                            : "Pending Approval"
                        }

                        ·

                        ${
                          product.is_active
                            ? "Active"
                            : "Inactive"
                        }

                      </p>


                    </div>


                    <button
                      class="secondary-btn"
                      onclick="openProductEditor('${product.id}')">

                      Edit

                    </button>


                  </div>

                `
              )
              .join("")

          : `

            <div
              class="empty-card">

              <h3>
                এখনো কোনো Product নেই
              </h3>

              <p>
                Add Product চাপুন।
              </p>

            </div>

          `
      }

    `;


  $("addProductBtn")
    ?.addEventListener(
      "click",
      () =>
        openProductEditor()
    );

}


/* =========================================================
   PRODUCT EDITOR
   ========================================================= */

async function openProductEditor(
  productId = null
) {

  if (!currentMyStore) {

    await loadManageProducts();

  }


  if (!currentMyStore) {

    showToast(
      "Store পাওয়া যায়নি"
    );

    return;

  }


  let product =
    null;


  if (productId) {

    const {
      data,
      error
    } = await sb
      .from("products")
      .select("*")
      .eq(
        "id",
        productId
      )
      .eq(
        "store_id",
        currentMyStore.id
      )
      .single();


    if (error) {

      console.error(
        error
      );

      showToast(
        "Product load করা যায়নি"
      );

      return;

    }


    product =
      data;

  }


  $("productEditorModal")
    ?.remove();


  const modal =
    document.createElement(
      "div"
    );


  modal.id =
    "productEditorModal";

  modal.className =
    "store-modal";


  modal.innerHTML = `

    <div
      class="store-modal-card">


      <button
        type="button"
        class="store-modal-close"
        id="closeProductEditor">

        ×

      </button>


      <h2>

        ${
          product
            ? "Edit Product"
            : "Add Product"
        }

      </h2>


      <form
        id="productEditorForm">


        <label>

          Product Image

          <input
            type="file"
            id="productImageFile"
            accept="image/*">

        </label>


        ${
          product?.image_url

            ? `

              <div
                class="store-image-preview">

                <img
                  src="${escapeHTML(
                    product.image_url
                  )}"
                  alt="Product">

              </div>

            `

            : ""

        }


        <label>

          Product Name

          <input
            type="text"
            id="productName"
            maxlength="150"
            value="${escapeHTML(
              product?.name ||
              ""
            )}"
            required>

        </label>


        <label>

          Category

          <select
            id="productCategory"
            required>

            <option value="">
              Select Category
            </option>

          </select>

        </label>


        <label>

          Price

          <input
            type="number"
            id="productPrice"
            min="0"
            step="0.01"
            value="${product?.price ?? ""}"
            required>

        </label>


        <label>

          Compare Price

          <input
            type="number"
            id="productComparePrice"
            min="0"
            step="0.01"
            value="${product?.compare_price ?? ""}">

        </label>


        <label>

          Stock

          <input
            type="number"
            id="productStock"
            min="0"
            step="1"
            value="${product?.stock ?? 0}"
            required>

        </label>


        <label>

          SKU

          <input
            type="text"
            id="productSku"
            maxlength="100"
            value="${escapeHTML(
              product?.sku ||
              ""
            )}">

        </label>


        <label>

          Description

          <textarea
            id="productDescription"
            rows="4"
            maxlength="1000">${escapeHTML(
              product?.description ||
              ""
            )}</textarea>

        </label>


        <label>

          <input
            type="checkbox"
            id="productActive"
            ${
              product
                ? product.is_active
                  ? "checked"
                  : ""
                : "checked"
            }>

          Active

        </label>


        <button
          type="submit"
          id="saveProductBtn"
          class="primary-store-btn">

          ${
            product
              ? "Save Changes"
              : "Add Product"
          }

        </button>


        ${
          product

            ? `

              <button
                type="button"
                id="toggleProductBtn"
                class="secondary-btn"
                style="
                  width:100%;
                  margin-top:10px;
                ">

                ${
                  product.is_active
                    ? "Deactivate Product"
                    : "Activate Product"
                }

              </button>


              <button
                type="button"
                id="deleteProductBtn"
                class="secondary-btn"
                style="
                  width:100%;
                  margin-top:10px;
                ">

                Delete Product

              </button>

            `

            : ""

        }


        <p
          id="productEditorMessage"
          class="store-form-message">
        </p>


      </form>

    </div>

  `;


  document.body.appendChild(
    modal
  );


  modal.classList.add(
    "show"
  );


  const categorySelect =
    $("productCategory");


  const {
    data: categoryData,
    error: categoryError
  } = await sb
    .from("categories")
    .select(
      "id,name"
    )
    .order("name");


  if (categoryError) {

    console.error(
      categoryError
    );

  }


  (categoryData || [])
    .forEach(
      category => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          category.id;


        option.textContent =
          category.name;


        if (
          product &&
          String(
            product.category_id
          ) ===
          String(
            category.id
          )
        ) {

          option.selected =
            true;

        }


        categorySelect
          .appendChild(
            option
          );

      }
    );


  $("closeProductEditor")
    ?.addEventListener(
      "click",
      () => modal.remove()
    );


  modal.addEventListener(
    "click",
    e => {

      if (
        e.target === modal
      ) {

        modal.remove();

      }

    }
  );


  $("productEditorForm")
    ?.addEventListener(
      "submit",
      async e => {

        e.preventDefault();


        const saveBtn =
          $("saveProductBtn");

        const message =
          $("productEditorMessage");


        saveBtn.disabled =
          true;

        saveBtn.textContent =
          "Saving...";


        try {

          const name =
            $("productName")
              .value
              .trim();


          const categoryId =
            $("productCategory")
              .value;


          const price =
            Number(
              $("productPrice")
                .value
            );


          const comparePriceValue =
            $("productComparePrice")
              .value;


          const comparePrice =
            comparePriceValue
              ? Number(
                  comparePriceValue
                )
              : null;


          const stock =
            Number(
              $("productStock")
                .value
            );


          const sku =
            $("productSku")
              .value
              .trim();


          const description =
            $("productDescription")
              .value
              .trim();


          const isActive =
            $("productActive")
              .checked;


          if (!name) {

            throw new Error(
              "Product name দিন।"
            );

          }


          if (!categoryId) {

            throw new Error(
              "Category নির্বাচন করুন।"
            );

          }


          if (
            !Number.isFinite(
              price
            ) ||
            price < 0
          ) {

            throw new Error(
              "সঠিক price দিন।"
            );

          }


          if (
            !Number.isInteger(
              stock
            ) ||
            stock < 0
          ) {

            throw new Error(
              "সঠিক stock দিন।"
            );

          }


          let imageUrl =
            product?.image_url ||
            null;


          const imageFile =
            $("productImageFile")
              ?.files[0];


          if (imageFile) {

            imageUrl =
              await uploadImage(
                imageFile,
                "product"
              );

          }


          const payload = {

            store_id:
              currentMyStore.id,

            category_id:
              categoryId,

            name,

            description:
              description ||
              null,

            price,

            compare_price:
              comparePrice,

            stock,

            sku:
              sku ||
              null,

            is_active:
              isActive,

            image_url:
              imageUrl,

            updated_at:
              new Date()
                .toISOString()

          };


          if (!product) {

            const baseSlug =
              name
                .toLowerCase()
                .trim()
                .replace(
                  /[^a-z0-9]+/g,
                  "-"
                )
                .replace(
                  /^-+|-+$/g,
                  ""
                );


            payload.slug =
              `${baseSlug || "product"}-${Math.random()
                .toString(36)
                .substring(2, 8)}`;


            payload.is_approved =
              false;


            const {
              error
            } = await sb
              .from("products")
              .insert(
                payload
              );


            if (error) {

              throw error;

            }


            showToast(
              "Product তৈরি হয়েছে"
            );

          } else {

            const {
              error
            } = await sb
              .from("products")
              .update(
                payload
              )
              .eq(
                "id",
                product.id
              )
              .eq(
                "store_id",
                currentMyStore.id
              );


            if (error) {

              throw error;

            }


            showToast(
              "Product update হয়েছে"
            );

          }


          modal.remove();


          await loadManageProducts();

          await loadProducts();


        } catch (error) {

          console.error(
            "Product save error:",
            error
          );


          message.textContent =
            error.message ||
            "Product save করা যায়নি।";

        }


        saveBtn.disabled =
          false;

        saveBtn.textContent =
          product
            ? "Save Changes"
            : "Add Product";

      }
    );


  $("toggleProductBtn")
    ?.addEventListener(
      "click",
      async () => {

        if (!product) return;


        const newStatus =
          !product.is_active;


        const {
          error
        } = await sb
          .from("products")
          .update({

            is_active:
              newStatus,

            updated_at:
              new Date()
                .toISOString()

          })
          .eq(
            "id",
            product.id
          )
          .eq(
            "store_id",
            currentMyStore.id
          );


        if (error) {

          console.error(
            error
          );

          showToast(
            "Product status update করা যায়নি"
          );

          return;

        }


        showToast(
          newStatus
            ? "Product activate হয়েছে"
            : "Product deactivate হয়েছে"
        );


        modal.remove();


        await loadManageProducts();

        await loadProducts();

      }
    );


  $("deleteProductBtn")
    ?.addEventListener(
      "click",
      async () => {

        if (!product) return;


        const confirmed =
          confirm(
            "এই Product permanently delete করতে চান?"
          );


        if (!confirmed) return;


        const {
          error
        } = await sb
          .from("products")
          .delete()
          .eq(
            "id",
            product.id
          )
          .eq(
            "store_id",
            currentMyStore.id
          );


        if (error) {

          console.error(
            error
          );

          showToast(
            "Product delete করা যায়নি"
          );

          return;

        }


        modal.remove();


        showToast(
          "Product delete হয়েছে"
        );


        await loadManageProducts();

        await loadProducts();

      }
    );

}


/* =========================================================
   STORE ORDERS
   ========================================================= */

async function loadStoreOrders() {

  const panel =
    $("sellerOrdersPanel");


  if (!panel) return;


  panel.innerHTML = `

    <div class="empty-card">

      <p>
        Orders loading...
      </p>

    </div>

  `;


  if (!currentMyStore) {

    panel.innerHTML = `

      <div class="empty-card">

        <p>
          Store পাওয়া যায়নি।
        </p>

      </div>

    `;

    return;

  }


  const {
    data: storeProducts,
    error: productError
  } = await sb
    .from("products")
    .select(
      "id"
    )
    .eq(
      "store_id",
      currentMyStore.id
    );


  if (productError) {

    panel.innerHTML = `

      <div class="empty-card">

        <p>
          ${escapeHTML(
            productError.message
          )}
        </p>

      </div>

    `;

    return;

  }


  const productIds =
    (storeProducts || [])
      .map(
        p => p.id
      );


  if (!productIds.length) {

    panel.innerHTML = `

      <div class="empty-card">

        <h3>
          এখনো কোনো Order নেই
        </h3>

        <p>
          Product তৈরি করার পর customer order করতে পারবে।
        </p>

      </div>

    `;

    return;

  }


  const {
    data: items,
    error: itemError
  } = await sb
    .from("order_items")
    .select(`
      id,
      store_order_id,
      product_id,
      product_name,
      unit_price,
      quantity,
      subtotal,
      created_at
    `)
    .in(
      "product_id",
      productIds
    )
    .order(
      "created_at",
      {
        ascending: false
      }
    );


  if (itemError) {

    panel.innerHTML = `

      <div class="empty-card">

        <h3>
          Orders load করা যায়নি
        </h3>

        <p>
          ${escapeHTML(
            itemError.message
          )}
        </p>

      </div>

    `;

    return;

  }


  const orderIds =
    [
      ...new Set(
        (items || [])
          .map(
            item =>
              item.store_order_id
          )
          .filter(Boolean)
      )
    ];


  if (!orderIds.length) {

    panel.innerHTML = `

      <div class="empty-card">

        <h3>
          এখনো কোনো Order নেই
        </h3>

      </div>

    `;

    return;

  }


  const {
    data: orders,
    error: orderError
  } = await sb
    .from("orders")
    .select(`
      id,
      buyer_id,
      total,
      payment_method,
      payment_status,
      customer_name,
      customer_phone,
      delivery_address,
      notes,
      status,
      created_at,
      updated_at
    `)
    .in(
      "id",
      orderIds
    )
    .order(
      "created_at",
      {
        ascending: false
      }
    );


  if (orderError) {

    panel.innerHTML = `

      <div class="empty-card">

        <h3>
          Orders load করা যায়নি
        </h3>

        <p>
          ${escapeHTML(
            orderError.message
          )}
        </p>

      </div>

    `;

    return;

  }


  if (!orders?.length) {

    panel.innerHTML = `

      <div class="empty-card">

        <h3>
          এখনো কোনো Order নেই
        </h3>

      </div>

    `;

    return;

  }


  panel.innerHTML =
    orders
      .map(
        order => {

          const orderItems =
            (items || [])
              .filter(
                item =>
                  String(
                    item.store_order_id
                  ) ===
                  String(
                    order.id
                  )
              );


          return `

            <div
              class="store-card"
              style="
                display:block;
                margin-bottom:15px;
              ">


              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  gap:10px;
                  align-items:flex-start;
                ">


                <div>

                  <h3>

                    Order #${escapeHTML(
                      String(
                        order.id
                      ).slice(
                        0,
                        8
                      )
                    )}

                  </h3>


                  <p>

                    ${escapeHTML(
                      order.customer_name ||
                      "Customer"
                    )}

                  </p>

                </div>


                <strong>

                  ${money(
                    order.total
                  )}

                </strong>

              </div>


              <p>

                📞
                ${escapeHTML(
                  order.customer_phone ||
                  ""
                )}

              </p>


              <p>

                📍
                ${escapeHTML(
                  order.delivery_address ||
                  ""
                )}

              </p>


              <div>

                ${
                  orderItems
                    .map(
                      item => `

                        <p>

                          ${escapeHTML(
                            item.product_name
                          )}

                          ×
                          ${item.quantity}

                          =
                          ${money(
                            item.subtotal
                          )}

                        </p>

                      `
                    )
                    .join("")
                }

              </div>


              <p>

                Payment:
                ${escapeHTML(
                  order.payment_method ||
                  ""
                )}

                ·

                ${escapeHTML(
                  order.payment_status ||
                  ""
                )}

              </p>


              <label>

                Order Status


                <select
                  class="order-status-select"
                  data-order-id="${order.id}">

                  ${
                    [
                      "pending",
                      "confirmed",
                      "processing",
                      "shipped",
                      "delivered",
                      "cancelled"
                    ]
                      .map(
                        status => `

                          <option
                            value="${status}"
                            ${
                              order.status ===
                              status
                                ? "selected"
                                : ""
                            }>

                            ${status}

                          </option>

                        `
                      )
                      .join("")
                  }

                </select>

              </label>


              ${
                order.notes

                  ? `

                    <p>

                      Note:
                      ${escapeHTML(
                        order.notes
                      )}

                    </p>

                  `

                  : ""
              }


            </div>

          `;

        }
      )
      .join("");


  panel
    .querySelectorAll(
      ".order-status-select"
    )
    .forEach(
      select => {

        select.addEventListener(
          "change",
          async () => {

            const orderId =
              select.dataset.orderId;


            const newStatus =
              select.value;


            const {
              error
            } = await sb
              .from("orders")
              .update({

                status:
                  newStatus,

                updated_at:
                  new Date()
                    .toISOString()

              })
              .eq(
                "id",
                orderId
              );


            if (error) {

              console.error(
                "Order update error:",
                error
              );


              showToast(
                "Order status update করা যায়নি"
              );

              return;

            }


            showToast(
              "Order status update হয়েছে"
            );

          }
        );

      }
    );

}


/* =========================================================
   MENU
   ========================================================= */

$("menuBtn")
  ?.addEventListener(
    "click",
    () =>
      showToast(
        "Menu options পরের ধাপে যুক্ত হবে"
      )
  );


/* =========================================================
   AUTHENTICATION
   ========================================================= */

let isRegisterMode =
  false;


const authModal =
  $("authModal");

const authForm =
  $("authForm");

const authEmail =
  $("authEmail");

const authPassword =
  $("authPassword");

const authTitle =
  $("authTitle");

const authSubtitle =
  $("authSubtitle");

const authSubmitBtn =
  $("authSubmitBtn");

const authSwitchBtn =
  $("authSwitchBtn");

const authMessage =
  $("authMessage");

const closeAuthBtn =
  $("closeAuthBtn");

const logoutBtn =
  $("logoutBtn");

const accountStatus =
  $("accountStatus");


/* =========================================================
   OPEN LOGIN
   ========================================================= */

$("loginBtn")
  ?.addEventListener(
    "click",
    () => {

      isRegisterMode =
        false;

      updateAuthUI();

      authModal
        ?.classList
        .add("show");

    }
  );


/* =========================================================
   CLOSE LOGIN
   ========================================================= */

closeAuthBtn
  ?.addEventListener(
    "click",
    () => {

      authModal
        ?.classList
        .remove("show");

    }
  );


/* =========================================================
   SWITCH LOGIN / REGISTER
   ========================================================= */

authSwitchBtn
  ?.addEventListener(
    "click",
    () => {

      isRegisterMode =
        !isRegisterMode;

      updateAuthUI();

    }
  );


/* =========================================================
   AUTH UI
   ========================================================= */

function updateAuthUI() {

  if (!authTitle) return;


  authTitle.textContent =
    isRegisterMode
      ? "Create Account"
      : "Login";


  if (authSubtitle) {

    authSubtitle.textContent =
      isRegisterMode

        ? "নতুন BuyHaat account তৈরি করুন।"

        : "আপনার BuyHaat account-এ Login করুন।";

  }


  if (authSubmitBtn) {

    authSubmitBtn.textContent =
      isRegisterMode
        ? "Create Account"
        : "Login";

  }


  if (authSwitchBtn) {

    authSwitchBtn.textContent =
      isRegisterMode

        ? "আগে থেকেই account আছে? Login করুন"

        : "নতুন account তৈরি করুন";

  }


  if (authMessage) {

    authMessage.textContent =
      "";

  }

}


/* =========================================================
   LOGIN / REGISTER
   ========================================================= */

authForm
  ?.addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      const email =
        authEmail
          ?.value
          .trim();


      const password =
        authPassword
          ?.value;


      if (
        !email ||
        !password
      ) {

        if (authMessage) {

          authMessage.textContent =
            "Email এবং password দিন।";

        }

        return;

      }


      if (authSubmitBtn) {

        authSubmitBtn.disabled =
          true;

        authSubmitBtn.textContent =
          isRegisterMode
            ? "Creating..."
            : "Logging in...";

      }


      try {

        if (
          isRegisterMode
        ) {

          const {
            data,
            error
          } =
            await sb.auth.signUp({

              email,

              password

            });


          if (error) {

            throw error;

          }


          if (data.user) {

            if (authMessage) {

              authMessage.textContent =
                "Account তৈরি হয়েছে। Email verification প্রয়োজন হতে পারে।";

            }

          }

        } else {

          const {
            error
          } =
            await sb.auth
              .signInWithPassword({

                email,

                password

              });


          if (error) {

            throw error;

          }


          authModal
            ?.classList
            .remove("show");


          showToast(
            "Login সফল হয়েছে"
          );


          await updateAuthState();


          if (
            location.hash ===
            "#my-store"
          ) {

            await loadMyStore();

          }

        }


      } catch (error) {

        console.error(
          "Auth error:",
          error
        );


        if (authMessage) {

          authMessage.textContent =
            error.message ||
            "Authentication failed.";

        }

      }


      if (authSubmitBtn) {

        authSubmitBtn.disabled =
          false;

      }


      updateAuthUI();

    }
  );


/* =========================================================
   LOGOUT
   ========================================================= */

logoutBtn
  ?.addEventListener(
    "click",
    async () => {

      const {
        error
      } =
        await sb.auth.signOut();


      if (error) {

        console.error(
          error
        );

        showToast(
          "Logout করা যায়নি"
        );

        return;

      }


      currentUser =
        null;

      currentMyStore =
        null;


      showToast(
        "Logout সফল হয়েছে"
      );


      await updateAuthState();


      location.hash =
        "home";

    }
  );


/* =========================================================
   AUTH STATE
   ========================================================= */

async function updateAuthState() {

  const user =
    await getCurrentUser();


  if (user) {

    if ($("loginBtn")) {

      $("loginBtn")
        .style.display =
        "none";

    }


    if (logoutBtn) {

      logoutBtn
        .style.display =
        "inline-flex";

    }


    if (accountStatus) {

      accountStatus.textContent =
        `Logged in: ${user.email}`;

    }


    const {
      data: store
    } = await sb
      .from("stores")
      .select("id")
      .eq(
        "owner_id",
        user.id
      )
      .maybeSingle();


    if ($("createStoreBtn")) {

      $("createStoreBtn")
        .style.display =
        store
          ? "none"
          : "inline-flex";

    }


  } else {

    if ($("loginBtn")) {

      $("loginBtn")
        .style.display =
        "inline-flex";

    }


    if (logoutBtn) {

      logoutBtn
        .style.display =
        "none";

    }


    if ($("createStoreBtn")) {

      $("createStoreBtn")
        .style.display =
        "inline-flex";

    }


    if (accountStatus) {

      accountStatus.textContent =
        "Buyer account, seller account এবং Store management এখানে থাকবে.";

    }

  }

}


/* =========================================================
   AUTH SESSION LISTENER
   ========================================================= */

sb.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

    console.log(
      "Auth event:",
      event
    );


    await updateAuthState();

  }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

async function init() {

  renderCategories();

  renderProducts();

  renderFollowing();

  await updateAuthState();

  route();

  await loadCategories();

  await loadProducts();

}


/* =========================================================
   START
   ========================================================= */

init();


window.addEventListener(
  "hashchange",
  route
);
