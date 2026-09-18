const products = [
  {id:"p001",name:"Wireless Headphone",price:1250,category:"Electronics",store:"Tech Corner",icon:"🎧",description:"দৈনন্দিন ব্যবহার ও music-এর জন্য wireless headphone."},
  {id:"p002",name:"Smart Watch",price:1850,category:"Electronics",store:"Digital House",icon:"⌚",description:"স্মার্ট ও lightweight watch, দৈনন্দিন ব্যবহারের জন্য।"},
  {id:"p003",name:"Lipstick",price:650,category:"Makeup",store:"Beauty Zone",icon:"💄",description:"বিভিন্ন shade-এর lipstick."},
  {id:"p004",name:"Casual T-Shirt",price:550,category:"Clothing",store:"Fashion Point",icon:"👕",description:"আরামদায়ক casual T-shirt."},
  {id:"p005",name:"Backpack",price:900,category:"Accessories",store:"Daily Needs",icon:"🎒",description:"স্কুল, কলেজ ও দৈনন্দিন ব্যবহারের backpack."},
  {id:"p006",name:"Running Shoes",price:1450,category:"Shoes",store:"Fashion Point",icon:"👟",description:"হালকা ও আরামদায়ক running shoes."}
];

const categories = ["All","Electronics","Makeup","Clothing","Shoes","Accessories"];
const followedStores = ["Tech Corner","Fashion Point"];

const $ = id => document.getElementById(id);

function money(n){return "৳" + n.toLocaleString("en-BD")}
function showToast(msg){
  const t=$("toast"); t.textContent=msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2200);
}

function renderCategories(){
  $("categories").innerHTML=categories.map((c,i)=>
    `<button class="category ${i===0?"active":""}" data-category="${c}">${c}</button>`
  ).join("");
  document.querySelectorAll(".category").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".category").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      renderProducts(btn.dataset.category, $("searchInput").value);
    });
  });
}

function renderProducts(category="All", query=""){
  let list=products.filter(p=>category==="All"||p.category===category);
  const q=query.trim().toLowerCase();
  if(q) list=list.filter(p=>(p.name+" "+p.store+" "+p.category).toLowerCase().includes(q));
  $("productCount").textContent=list.length+" products";
  $("products").innerHTML=list.length ? list.map(p=>`
    <article class="product-card" data-product="${p.id}">
      <div class="product-image">${p.icon}</div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="price">${money(p.price)}</div>
        <div class="store-name">${p.store}</div>
      </div>
    </article>`).join("") :
    `<div class="empty-card"><h3>কোনো product পাওয়া যায়নি</h3><p>অন্য keyword বা category চেষ্টা করুন।</p></div>`;

  document.querySelectorAll("[data-product]").forEach(card=>{
    card.addEventListener("click",()=>openProduct(card.dataset.product));
  });
}

function openProduct(id){
  const p=products.find(x=>x.id===id); if(!p)return;
  location.hash="product/"+p.id;
  $("product-detail").innerHTML=`
    <div class="detail">
      <button class="back-btn" onclick="location.hash='home'">← Back to Home</button>
      <div class="detail-card">
        <div class="detail-image">${p.icon}</div>
        <div class="detail-body">
          <div class="eyebrow">${p.category.toUpperCase()}</div>
          <h1>${p.name}</h1>
          <div class="store-name">Store: ${p.store}</div>
          <div class="detail-price">${money(p.price)}</div>
          <p class="detail-desc">${p.description}</p>
          <button class="order-btn" onclick="startOrder('${p.id}')">ORDER NOW</button>
        </div>
      </div>
    </div>`;
  showPage("product-detail");
}

function startOrder(id){
  const p=products.find(x=>x.id===id);
  showToast(`${p.name} — Order system পরের ধাপে Supabase-এর সাথে যুক্ত হবে`);
}

function renderFollowing(){
  $("followingList").innerHTML=followedStores.map(store=>`
    <div class="store-card">
      <div class="store-avatar">${store.charAt(0)}</div>
      <div class="store-meta"><h3>${store}</h3><p>Followed Store</p></div>
      <button class="secondary-btn" onclick="showToast('Store page পরের ধাপে যুক্ত হবে')">View</button>
    </div>`).join("");
}

function showPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  $(page).classList.add("active");
  document.querySelectorAll(".bottom-nav a").forEach(a=>a.classList.toggle("active",a.dataset.page===page));
  window.scrollTo({top:0,behavior:"smooth"});
}

function route(){
  const hash=location.hash.replace("#","");
  if(hash.startsWith("product/")){ openProduct(hash.split("/")[1]); return; }
  const page=hash||"home";
  const valid=["home","following","add-product","chat","my-store"];
  showPage(valid.includes(page)?page:"home");
}

$("searchInput").addEventListener("input",()=> {
  const active=document.querySelector(".category.active");
  renderProducts(active?.dataset.category||"All",$("searchInput").value);
});
$("searchBtn").addEventListener("click",()=> {
  $("searchInput").focus();
  renderProducts("All",$("searchInput").value);
});
$("loginBtn").addEventListener("click",()=>showToast("Supabase authentication পরের ধাপে যুক্ত হবে"));
$("createStoreBtn").addEventListener("click",()=>showToast("Store creation পরের ধাপে যুক্ত হবে"));
$("menuBtn").addEventListener("click",()=>showToast("Menu options পরের ধাপে যুক্ত হবে"));

renderCategories();
renderProducts();
renderFollowing();
route();
window.addEventListener("hashchange",route);
