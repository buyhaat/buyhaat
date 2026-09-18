BUYHAAT COMPLETE
- index.html
- style.css
- app.js
- supabase-config.js

গুরুত্বপূর্ণ:
1) supabase-config.js-এ তোমার আগের Supabase URL ও anon key বসাবে।
2) এই app.js-এ আলাদা routing রাখা হয়েছে: Home, Following, Add Product, Chat, My Store, Product Detail।
3) Product search-এর পাশাপাশি Store name এবং @slug search করা আছে।
4) Public Store search-এ is_active=true + is_approved=true Store দেখাবে।
5) নতুন Store is_approved=false হলে public search-এ দেখা যাবে না—এটা তোমার আগের approval system অনুযায়ী।
6) তোমার database schema-তে নতুন column ধরে নেওয়া হয়নি।