/* =========================================================
   js/products.js  —  Catalog + Product-detail page logic
   ========================================================= */

// ── CATALOG PAGE (index.html) ─────────────────────────────
if (document.getElementById("product-grid")) {
  let allProducts = [];
  let filtered    = [];

  document.addEventListener("DOMContentLoaded", async () => {
    updateCartBadge();
    try {
      allProducts = await fetchProducts();
    } catch (e) {
      console.error(e);
      document.getElementById("product-grid").innerHTML =
        `<p class="load-error">Could not load products. Please check products.json.</p>`;
      return;
    }
    filtered = [...allProducts];
    populateCategoryFilter(allProducts);
    renderGrid(filtered);
    attachCatalogListeners();
  });

  function populateCategoryFilter(products) {
    const cats    = [...new Set(products.map(p => p.category))].sort();
    const select  = document.getElementById("filter-category");
    cats.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
  }

  function attachCatalogListeners() {
    document.getElementById("search-input").addEventListener("input", applyFilters);
    document.getElementById("filter-category").addEventListener("change", applyFilters);
    document.getElementById("sort-select").addEventListener("change", applyFilters);
  }

  function applyFilters() {
    const query    = document.getElementById("search-input").value.toLowerCase();
    const category = document.getElementById("filter-category").value;
    const sort     = document.getElementById("sort-select").value;

    filtered = allProducts.filter(p => {
      const matchesSearch   = !query || p.name.toLowerCase().includes(query) ||
                              p.shortDescription.toLowerCase().includes(query) ||
                              p.category.toLowerCase().includes(query);
      const matchesCategory = !category || p.category === category;
      return matchesSearch && matchesCategory;
    });

    // Sort
    if (sort === "price-asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else {
      // "featured" — featured first, then by natural order
      filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    renderGrid(filtered);
  }

  function renderGrid(products) {
    const grid    = document.getElementById("product-grid");
    const countEl = document.getElementById("results-count");

    if (countEl) {
      countEl.textContent = products.length === 1
        ? "1 product"
        : `${products.length} products`;
    }

    if (!products.length) {
      grid.innerHTML = `<p class="no-results">No products match your search. Try a different filter.</p>`;
      return;
    }

    grid.innerHTML = products.map(p => productCard(p)).join("");

    // Quick-add buttons
    grid.querySelectorAll(".quick-add-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        const id = btn.dataset.id;
        const product = findProduct(allProducts, id);
        if (!product || !product.inStock) return;

        // If product has variants, go to detail page instead
        if (product.variants && product.variants.length) {
          window.location.href = `product.html?id=${id}`;
          return;
        }
        addToCart(product, null, 1);
        showToast(`"${product.name}" added to cart 🛒`);
        updateCartBadge();
      });
    });
  }

  function productCard(p) {
    const imgSrc   = p.images && p.images[0] ? p.images[0] : placeholderSrc(p.name);
    const badge    = p.inStock ? "" : `<span class="badge badge--oos">Out of Stock</span>`;
    const featured = p.featured ? `<span class="badge badge--featured">Featured</span>` : "";
    const compare  = p.compareAtPrice
      ? `<span class="price-compare">${formatPrice(p.compareAtPrice)}</span>` : "";
    const saleBadge = p.compareAtPrice
      ? `<span class="badge badge--sale">Sale</span>` : "";

    return `
      <a href="product.html?id=${p.id}" class="product-card">
        <div class="product-card__img-wrap">
          <img src="${imgSrc}" alt="${p.name}" class="product-card__img" loading="lazy"
               onerror="onImgError(this,'${p.name}')">
          <div class="product-card__badges">${featured}${saleBadge}${badge}</div>
        </div>
        <div class="product-card__body">
          <p class="product-card__category">${p.category}</p>
          <h3 class="product-card__name">${p.name}</h3>
          <p class="product-card__desc">${p.shortDescription}</p>
          <div class="product-card__pricing">
            <span class="price">${formatPrice(p.price)}</span>
            ${compare}
          </div>
          <button class="quick-add-btn btn btn--outline" data-id="${p.id}"
                  ${!p.inStock ? "disabled" : ""}>
            ${p.inStock ? (p.variants && p.variants.length ? "Select Options" : "Add to Cart") : "Out of Stock"}
          </button>
        </div>
      </a>
    `;
  }
}

// ── PRODUCT DETAIL PAGE (product.html) ───────────────────
if (document.getElementById("product-detail")) {
  let products = [];
  let currentProduct = null;

  document.addEventListener("DOMContentLoaded", async () => {
    updateCartBadge();
    const params = new URLSearchParams(window.location.search);
    const id     = params.get("id");

    try {
      products = await fetchProducts();
    } catch (e) {
      document.getElementById("product-detail").innerHTML =
        `<p class="load-error">Could not load products.</p>`;
      return;
    }

    if (!id) { window.location.href = "index.html"; return; }

    currentProduct = findProduct(products, id);
    if (!currentProduct) { window.location.href = "index.html"; return; }

    renderProductDetail(currentProduct);
  });

  function renderProductDetail(p) {
    document.title = `${p.name} — ${CONFIG.STORE_NAME}`;

    // Gallery
    renderGallery(p);

    // Text content
    document.getElementById("pd-category").textContent   = p.category;
    document.getElementById("pd-name").textContent       = p.name;
    document.getElementById("pd-price").textContent      = formatPrice(p.price);
    document.getElementById("pd-desc").textContent       = p.description;

    const comparEl = document.getElementById("pd-compare");
    if (p.compareAtPrice) {
      comparEl.textContent = formatPrice(p.compareAtPrice);
      comparEl.style.display = "inline";
    } else {
      comparEl.style.display = "none";
    }

    // Stock status
    const stockEl = document.getElementById("pd-stock");
    stockEl.textContent  = p.inStock ? "In Stock" : "Out of Stock";
    stockEl.className    = "pd-stock " + (p.inStock ? "pd-stock--in" : "pd-stock--out");

    // Variants
    renderVariants(p);

    // Add to cart button
    const addBtn = document.getElementById("add-to-cart-btn");
    if (!p.inStock) {
      addBtn.disabled    = true;
      addBtn.textContent = "Out of Stock";
    }
    addBtn.addEventListener("click", handleAddToCart);
  }

  function renderGallery(p) {
    const images = p.images && p.images.length ? p.images : [placeholderSrc(p.name)];
    const main   = document.getElementById("gallery-main");
    const thumbs = document.getElementById("gallery-thumbs");

    main.src = images[0];
    main.alt = p.name;
    main.onerror = () => onImgError(main, p.name);

    thumbs.innerHTML = images.map((src, i) => `
      <button class="thumb-btn ${i === 0 ? "thumb-btn--active" : ""}" data-src="${src}">
        <img src="${src}" alt="${p.name} view ${i + 1}"
             onerror="onImgError(this,'${p.name}')">
      </button>
    `).join("");

    thumbs.querySelectorAll(".thumb-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        main.src = btn.dataset.src;
        thumbs.querySelectorAll(".thumb-btn").forEach(b => b.classList.remove("thumb-btn--active"));
        btn.classList.add("thumb-btn--active");
      });
    });
  }

  function renderVariants(p) {
    const container = document.getElementById("pd-variants");
    container.innerHTML = "";
    if (!p.variants || !p.variants.length) return;

    p.variants.forEach((variant, vIdx) => {
      const group = document.createElement("div");
      group.className = "variant-group";
      group.innerHTML = `<label class="variant-label">${variant.label}</label>`;

      const optionsWrap = document.createElement("div");
      optionsWrap.className = "variant-options";

      variant.options.forEach((opt, oIdx) => {
        const btn = document.createElement("button");
        btn.className   = "variant-btn" + (oIdx === 0 ? " variant-btn--active" : "");
        btn.textContent = opt.name;
        btn.dataset.vIdx = vIdx;
        btn.dataset.oIdx = oIdx;
        btn.addEventListener("click", () => {
          optionsWrap.querySelectorAll(".variant-btn").forEach(b => b.classList.remove("variant-btn--active"));
          btn.classList.add("variant-btn--active");
          updatePriceDisplay(p);
        });
        optionsWrap.appendChild(btn);
      });

      group.appendChild(optionsWrap);
      container.appendChild(group);
    });

    updatePriceDisplay(p);
  }

  function getSelectedVariantAdjust(p) {
    if (!p.variants || !p.variants.length) return { label: null, adjust: 0 };
    let adjust = 0;
    let parts   = [];
    p.variants.forEach((variant, vIdx) => {
      const activeBtn = document.querySelector(`.variant-btn[data-v-idx="${vIdx}"].variant-btn--active`)
        || document.querySelectorAll(`.variant-btn[data-v-idx="${vIdx}"]`)[0];
      if (!activeBtn) return;
      const oIdx = parseInt(activeBtn.dataset.oIdx);
      const opt  = variant.options[oIdx];
      adjust += opt.priceAdjust || 0;
      parts.push(`${variant.label}: ${opt.name}`);
    });
    // Fallback: grab all active buttons
    if (!parts.length) {
      document.querySelectorAll(".variant-btn--active").forEach(btn => {
        const vIdx = parseInt(btn.dataset.vIdx);
        const oIdx = parseInt(btn.dataset.oIdx);
        const opt  = p.variants[vIdx].options[oIdx];
        adjust += opt.priceAdjust || 0;
        parts.push(`${p.variants[vIdx].label}: ${opt.name}`);
      });
    }
    return { label: parts.join(", "), adjust };
  }

  function updatePriceDisplay(p) {
    const { adjust } = getSelectedVariantAdjust(p);
    const priceEl    = document.getElementById("pd-price");
    priceEl.textContent = formatPrice(p.price + adjust);
  }

  function handleAddToCart() {
    if (!currentProduct || !currentProduct.inStock) return;
    const { label, adjust } = getSelectedVariantAdjust(currentProduct);
    const finalPrice = currentProduct.price + adjust;
    addToCart(currentProduct, label, 1, finalPrice);
    showToast(`"${currentProduct.name}" added to cart 🛒`);
    updateCartBadge();
  }
}

/* ── Shared cart-add helper ─────────────────────────────── */
function addToCart(product, variantLabel, qty = 1, overridePrice = null) {
  const cart  = getCart();
  const price = overridePrice !== null ? overridePrice : product.price;
  const key   = product.id + (variantLabel || "");

  const existing = cart.find(i => i.productId === product.id && (i.variant || "") === (variantLabel || ""));
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      productId: product.id,
      name:      product.name,
      price,
      variant:   variantLabel || null,
      qty
    });
  }
  saveCart(cart);
}
