
  class Product {
    constructor(id, name, category, price, image, description) {
      this.id = id;
      this.name = name;
      this.category = category;
      this.price = price;
      this.image = image;
      this.description = description;
    }
  }

  class CartItem {
    constructor(product, quantity = 1) {
      this.product = product;
      this.quantity = quantity;
    }
    getSubtotal() {
      return this.product.price * this.quantity;
    }
  }

  class Cart {
    constructor() {
      this.items = [];
      this.loadFromStorage();
    }

    addItem(product) {
      const existingItem = this.items.find(item => item.product.id === product.id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        this.items.push(new CartItem(product, 1));
      }
      this.saveToStorage();
    }

    updateQuantity(productId, change) {
      const item = this.items.find(item => item.product.id === productId);
      if (!item) return;

      item.quantity += change;
      if (item.quantity <= 0) {
        this.removeItem(productId);
      } else {
        this.saveToStorage();
      }
    }

    removeItem(productId) {
      this.items = this.items.filter(item => item.product.id !== productId);
      this.saveToStorage();
    }

    getTotalCount() {
      return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    getTotalPrice() {
      return this.items.reduce((sum, item) => sum + item.getSubtotal(), 0);
    }

    clear() {
      this.items = [];
      localStorage.removeItem("storedCart");
    }

    saveToStorage() {
      localStorage.setItem("storedCart", JSON.stringify(this.items));
    }

    loadFromStorage() {
      const saved = localStorage.getItem("storedCart");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          this.items = parsed.map(entry => new CartItem(
            new Product(entry.product.id, entry.product.name, entry.product.category, entry.product.price, entry.product.image, entry.product.description),
            entry.quantity
          ));
        } catch (err) {
          console.error("Cart storage loading error:", err);
          this.items = [];
        }
      }
    }
  }

  class Order {
    constructor(customer, items, totalPrice) {
      this.orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
      this.customer = customer;
      this.items = items;
      this.totalPrice = totalPrice;
      this.date = new Date().toLocaleDateString();
    }
  }

  
  let catalog = [];
  const cart = new Cart();

  const productGrid = document.getElementById("productGrid");
  const statusMessage = document.getElementById("statusMessage");
  const cartCountBadge = document.getElementById("cartCount");
  const searchInput = document.getElementById("searchInput");
  const categorySelect = document.getElementById("categorySelect");
  const sortSelect = document.getElementById("sortSelect");

  const cartModal = document.getElementById("cartModal");
  const checkoutModal = document.getElementById("checkoutModal");
  const receiptModal = document.getElementById("receiptModal");

  const viewCartBtn = document.getElementById("viewCartBtn");
  const closeCartBtn = document.getElementById("closeCartBtn");
  const proceedCheckoutBtn = document.getElementById("proceedCheckoutBtn");
  const closeCheckoutBtn = document.getElementById("closeCheckoutBtn");
  const checkoutForm = document.getElementById("checkoutForm");
  const cartItemsContainer = document.getElementById("cartItemsContainer");
  const cartTotalElement = document.getElementById("cartTotal");
  const receiptDetails = document.getElementById("receiptDetails");
  const closeReceiptBtn = document.getElementById("closeReceiptBtn");
  const receiptDoneBtn = document.getElementById("receiptDoneBtn");
  const toast = document.getElementById("toast");
  const cursorTooltip = document.getElementById("cursorTooltip");

  
  async function loadProducts() {
    try {
      statusMessage.textContent = "Loading products, please wait...";
      const response = await fetch("products.json");
      if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

      const data = await response.json();
      catalog = data.map(item => new Product(item.id, item.name, item.category, item.price, item.image, item.description));
      statusMessage.style.display = "none";
      renderProducts(catalog);
    } catch (error) {
      statusMessage.textContent = "Failed to load products. Check your connection or server.";
      statusMessage.style.color = "#ef4444";
    }
  }

 
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2000);
  }

  function animateFlyToCart(productCard) {
    const productImg = productCard.querySelector("img");
    if (!productImg || !viewCartBtn) return;

    const imgRect = productImg.getBoundingClientRect();
    const cartRect = viewCartBtn.getBoundingClientRect();

    const flyingImg = document.createElement("img");
    flyingImg.src = productImg.src;
    flyingImg.className = "flying-img";
    flyingImg.style.top = `${imgRect.top}px`;
    flyingImg.style.left = `${imgRect.left}px`;
    flyingImg.style.width = `${imgRect.width}px`;
    flyingImg.style.height = `${imgRect.height}px`;

    document.body.appendChild(flyingImg);

    requestAnimationFrame(() => {
      flyingImg.style.top = `${cartRect.top + 5}px`;
      flyingImg.style.left = `${cartRect.left + 20}px`;
      flyingImg.style.width = "24px";
      flyingImg.style.height = "24px";
      flyingImg.style.opacity = "0.2";
    });

    setTimeout(() => {
      flyingImg.remove();
      viewCartBtn.classList.add("cart-bump");
      setTimeout(() => viewCartBtn.classList.remove("cart-bump"), 300);
    }, 700);
  }

  
  function renderProducts(productList) {
    if (productList.length === 0) {
      productGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #64748b;">No products match your criteria.</div>`;
      return;
    }

    productGrid.innerHTML = productList.map(prod => `
      <div class="product-card" data-id="${prod.id}">
        <div class="product-card-img-wrap"><img src="${prod.image}" alt="${prod.name}"></div>
        <div class="product-info">
          <span class="product-category">${prod.category}</span>
          <h3 class="product-title">${prod.name}</h3>
          <p class="product-desc">${prod.description}</p>
          <div class="product-bottom-row">
            <span class="product-price">$${prod.price.toFixed(2)}</span>
            <button class="btn-add" data-id="${prod.id}">+ Add</button>
          </div>
        </div>
      </div>
    `).join("");
  }

  function applyFilterAndSort() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedCategory = categorySelect.value;
    const sortOption = sortSelect.value;

    let filtered = catalog.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm) || product.description.toLowerCase().includes(searchTerm);
      const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    if (sortOption === "low-to-high") filtered.sort((a, b) => a.price - b.price);
    if (sortOption === "high-to-low") filtered.sort((a, b) => b.price - a.price);

    renderProducts(filtered);
  }

  function renderCart() {
    cartCountBadge.textContent = cart.getTotalCount();
    cartTotalElement.textContent = cart.getTotalPrice().toFixed(2);

    if (cart.items.length === 0) {
      cartItemsContainer.innerHTML = `<div style="text-align: center; padding: 30px 0; color: #64748b;">🛒 Your cart is currently empty.</div>`;
      return;
    }

    cartItemsContainer.innerHTML = cart.items.map(item => `
      <div class="cart-row">
        <div class="cart-row-details">
          <strong>${item.product.name}</strong>
          <span class="cart-row-price">$${item.product.price.toFixed(2)} × ${item.quantity} = $${item.getSubtotal().toFixed(2)}</span>
        </div>
        <div class="cart-controls">
          <button class="qty-btn" data-id="${item.product.id}" data-action="decrease">−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" data-id="${item.product.id}" data-action="increase">+</button>
          <button class="remove-btn" data-id="${item.product.id}">✕</button>
        </div>
      </div>
    `).join("");
  }

  
  function validateForm() {
    let isValid = true;
    const fields = [
      { id: "fullName", errorId: "nameError", test: v => v.length >= 3, msg: "Full name must be at least 3 characters." },
      { id: "email", errorId: "emailError", test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: "Enter a valid email address." },
      { id: "phone", errorId: "phoneError", test: v => /^[0-9]{7,12}$/.test(v), msg: "Phone number must be 7 to 12 digits." },
      { id: "address", errorId: "addressError", test: v => v.length >= 8, msg: "Please provide a complete address." },
      { id: "paymentMethod", errorId: "paymentError", test: v => v !== "", msg: "Please select a payment method." }
    ];

    fields.forEach(f => {
      const el = document.getElementById(f.id);
      const errEl = document.getElementById(f.errorId);
      errEl.textContent = "";
      if (!f.test(el.value.trim())) {
        errEl.textContent = f.msg;
        isValid = false;
      }
    });

    return isValid;
  }

 
  productGrid.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-add")) {
      const id = parseInt(e.target.getAttribute("data-id"));
      const selectedProduct = catalog.find(item => item.id === id);
      if (selectedProduct) {
        animateFlyToCart(e.target.closest(".product-card"));
        cart.addItem(selectedProduct);
        renderCart();
        showToast(`Added "${selectedProduct.name}" to cart!`);
      }
    }
  });

  cartItemsContainer.addEventListener("click", (e) => {
    const id = parseInt(e.target.getAttribute("data-id"));
    if (e.target.classList.contains("qty-btn")) {
      cart.updateQuantity(id, e.target.getAttribute("data-action") === "increase" ? 1 : -1);
      renderCart();
    } else if (e.target.classList.contains("remove-btn")) {
      cart.removeItem(id);
      renderCart();
      showToast("Item removed from cart");
    }
  });

  searchInput.addEventListener("input", applyFilterAndSort);
  categorySelect.addEventListener("change", applyFilterAndSort);
  sortSelect.addEventListener("change", applyFilterAndSort);

  viewCartBtn.addEventListener("click", () => { renderCart(); cartModal.classList.remove("hidden"); });
  closeCartBtn.addEventListener("click", () => cartModal.classList.add("hidden"));
  proceedCheckoutBtn.addEventListener("click", () => {
    if (cart.items.length === 0) return alert("Your cart is empty!");
    cartModal.classList.add("hidden");
    checkoutModal.classList.remove("hidden");
  });
  closeCheckoutBtn.addEventListener("click", () => checkoutModal.classList.add("hidden"));

  checkoutForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const order = new Order({
      name: document.getElementById("fullName").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      address: document.getElementById("address").value.trim(),
      payment: document.getElementById("paymentMethod").value
    }, [...cart.items], cart.getTotalPrice());

    receiptDetails.innerHTML = `
      <div class="receipt-meta">
        <div><strong>Order ID:</strong> ${order.orderId}</div>
        <div><strong>Recipient:</strong> ${order.customer.name}</div>
        <div><strong>Contact:</strong> ${order.customer.phone} (${order.customer.email})</div>
        <div><strong>Ship To:</strong> ${order.customer.address}</div>
        <div><strong>Payment:</strong> ${order.customer.payment}</div>
      </div>
      <div class="receipt-item-list">
        ${order.items.map(item => `<div class="receipt-summary-item"><span>${item.product.name} × ${item.quantity}</span><strong>$${item.getSubtotal().toFixed(2)}</strong></div>`).join("")}
      </div>
      <div class="receipt-total-row"><span>Total Paid</span><span style="color:#047857;">$${order.totalPrice.toFixed(2)}</span></div>
    `;

    cart.clear();
    renderCart();
    checkoutForm.reset();
    checkoutModal.classList.add("hidden");
    receiptModal.classList.remove("hidden");
  });

  closeReceiptBtn.addEventListener("click", () => receiptModal.classList.add("hidden"));
  receiptDoneBtn.addEventListener("click", () => receiptModal.classList.add("hidden"));

  window.addEventListener("click", (e) => {
    [cartModal, checkoutModal, receiptModal].forEach(m => { if (e.target === m) m.classList.add("hidden"); });
  });

 
  productGrid.addEventListener("mouseover", (e) => {
    const card = e.target.closest(".product-card");
    if (!card) return;
    const product = catalog.find(item => item.id === parseInt(card.dataset.id));
    if (product) {
      cursorTooltip.innerHTML = `
        <span class="tooltip-badge">${product.category}</span>
        <div class="tooltip-title">${product.name}</div>
        <div class="tooltip-desc">${product.description}</div>
        <div class="tooltip-price">$${product.price.toFixed(2)}</div>
      `;
      cursorTooltip.classList.remove("hidden");
    }
  });

  productGrid.addEventListener("mousemove", (e) => {
    if (cursorTooltip.classList.contains("hidden")) return;
    const posX = (e.clientX + 270 > window.innerWidth) ? e.clientX - 275 : e.clientX + 16;
    const posY = (e.clientY + 160 > window.innerHeight) ? e.clientY - 160 : e.clientY + 16;
    cursorTooltip.style.left = `${posX}px`;
    cursorTooltip.style.top = `${posY}px`;
  });

  productGrid.addEventListener("mouseout", (e) => {
    const card = e.target.closest(".product-card");
    if (card && !card.contains(e.relatedTarget)) cursorTooltip.classList.add("hidden");
  });

 
  loadProducts();
  renderCart();