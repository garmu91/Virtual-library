/**
 * Library Management System with Logistics Features
 * Optimized for performance, readability, and maintainability.
 * Features:
 * - Loading books from JSON
 * - Filtering by genre/stock/location
 * - Shopping cart with localStorage
 * - Dark/light mode
 * - Stock tracking, CSV export
 */

// =============================================
// 1. GLOBAL STATE AND CONSTANTS
// =============================================
const STATE = {
  allBooks: [],
  cart: [],
  filters: {
    genre: "select",
    stock: "all",
    location: "",
  },
};

const SELECTORS = {
  bookTemplate: "#book-template",
  genreFilter: "#genre-filter",
  stockFilter: "#stock-filter",
  locationFilter: "#location-filter",
  shoppingList: "#shopping-list",
  list: "#list",
  shoppingListHeading: "#shopping-list-heading",
  availableBooksHeading: "#available-books-heading",
  catalogueTotalHeading: "#catalogue-total-heading",
  themeSwitch: "#theme-switch",
  exportCsv: "#export-csv",
  book: ".book",
  cover: ".cover",
  title: ".title",
  genre: ".genre",
  stock: ".stock",
  location: ".location",
  coverPurchase: ".cover-purchase",
  deleteBook: ".delete-book",
};

// =============================================
// 2. INITIALIZATION
// =============================================
document.addEventListener("DOMContentLoaded", init);

function init() {
  loadBooks();
  initThemeToggle();
}

// =============================================
// 3. THEME TOGGLE
// =============================================
function initThemeToggle() {
  const themeSwitch = document.querySelector(SELECTORS.themeSwitch);
  const body = document.body;

  const applyTheme = (isDark) => {
    body.classList.toggle("dark-mode", isDark);
    localStorage.setItem("dark-mode", isDark ? "active" : "inactive");
  };

  // Apply saved theme or default to light
  applyTheme(localStorage.getItem("dark-mode") === "active");

  themeSwitch?.addEventListener("click", () => {
    applyTheme(!body.classList.contains("dark-mode"));
  });
}

// =============================================
// 4. DATA LOADING AND RENDERING
// =============================================
async function loadBooks() {
  try {
    const response = await fetch("./assets/json/books.json");
    if (!response.ok) throw new Error("Failed to load books");

    const data = await response.json();
    STATE.allBooks = normalizeBookData(data.library);

    // Store original stock in localStorage if not already stored
    if (!localStorage.getItem("original-stock")) {
      const originalStock = {};
      STATE.allBooks.forEach((item) => {
        originalStock[item.book.ISBN] = item.book.stock;
      });
      localStorage.setItem("original-stock", JSON.stringify(originalStock));
    }

    renderBooks(STATE.allBooks);
    initFilters(STATE.allBooks);
    initShoppingCart();
    updateTotalBooksInStock();
    catalogueTotalBooks();
  } catch (error) {
    console.error("Error loading books:", error);
    document
      .querySelector(SELECTORS.bookTemplate)
      ?.insertAdjacentHTML(
        "beforeend",
        "<p>Failed to load books. Please try again later.</p>",
      );
  }
}

/**
 * Normalizes book data to ensure all fields exist
 * @param {Array} library - Array of book objects
 * @returns {Array} Normalized array of book objects
 */
function normalizeBookData(library) {
  return library.map((item) => ({
    ...item,
    book: {
      ...item.book,
      title: item.book.title || "Sans titre",
      pages: item.book.pages || "N/A",
      genre: item.book.genre || "N/A",
      cover: {
        src: item.book.cover?.src || "#",
        alt: item.book.cover?.alt || "N/A",
      },
      synopsis: item.book.synopsis || "N/A",
      year: item.book.year || "N/A",
      ISBN: item.book.ISBN || `temp-${Math.random().toString(36).substr(2, 9)}`,
      author: {
        name: item.book.author?.name || "N/A",
        otherBooks: item.book.author?.otherBooks || "N/A",
      },
      stock: item.book.stock || 0,
      price: item.book.price || 15.99,
      location: item.book.location || "N/A",
      supplier: item.book.supplier || "N/A",
    },
  }));
}

// =============================================
// 5. RENDERING FUNCTIONS
// =============================================
/**
 * Renders books to the DOM
 * @param {Array} books - Array of book objects to render (defaults to STATE.allBooks)
 */
function renderBooks(books = STATE.allBooks) {
  const container = document.querySelector(SELECTORS.bookTemplate);
  if (!container) return;

  container.innerHTML = books.map(createBookElement).join("");

  // Initialize flip buttons and quantity selectors after rendering
  initFlipButtons();
  initQuantitySelectors();
}

/**
 * Creates a book element HTML string
 * @param {Object} item - Book item object
 * @returns {string} HTML string for the book element
 */
function createBookElement(item) {
  if (!item.book) return "";

  const book = item.book;
  const stockStatus = getStockStatus(book.stock);
  const stockClass = getStockClass(book.stock);

  return `
    <div class="book ${stockClass}" data-id="${book.ISBN}" data-stock="${book.stock}">
      <div class="book-front">
        <b><span class="title">${book.title}</span></b>
        <img class="cover" src="${book.cover?.src}" alt="${book.cover?.alt}" loading="lazy">
        <p class="stock ${stockClass}">${stockStatus}</p>
        <p class="location">Location: ${book.location}</p>

        <div class="book-actions">
          <div class="quantity-selector">
            <button class="decrement" aria-label="Decrease quantity">-</button>
            <input
              type="number"
              class="quantity-input"
              min="0"
              max="${book.stock}"
              value="1"
              data-id="${book.ISBN}"
              data-title="${book.title}"
              aria-label="Input for selecting quantity"
            >
            <button class="increment" aria-label="Increase quantity">+</button>
          </div>
          <button class="add-to-cart" aria-label="Add to cart" data-id="${book.ISBN}">
            ➕ Add to Cart
          </button>
          <button class="flip-button" aria-label="Voir les détails du livre">➥</button>
        </div>
      </div>
      <div class="book-back">
        <p>Pages: <span>${book.pages}</span></p>
        <p>Genre: <span class="genre">${book.genre}</span></p>
        <p>Synopsis: <span>${book.synopsis}</span></p>
        <p>Year: <span>${book.year}</span></p>
        <p>ISBN: <span>${book.ISBN}</span></p>
        <p>Author: <span>${book.author?.name}</span></p>
        <p>Other Books: <span>${Array.isArray(book.author?.otherBooks) ? book.author.otherBooks.join(", ") : "N/A"}</span></p>
        <p>Price: €<span>${book.price?.toFixed(2)}</span></p>
        <p>Supplier: <span>${book.supplier}</span></p>
        <button class="flip-button" aria-label="Voir les détails du livre">➥</button>
      </div>
    </div>
  `;
}

function getStockStatus(stock) {
  if (stock <= 0) return "Rupture de stock";
  if (stock <= 5) return `Stock faible (${stock})`;
  return `En Stock (${stock})`;
}

function getStockClass(stock) {
  if (stock <= 0) return "out-of-stock";
  if (stock <= 5) return "low-stock";
  return "in-stock";
}

// =============================================
// Function to handle flip button click
// =============================================
function initFlipButtons() {
  document.querySelectorAll(".flip-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent event from bubbling up
      const bookElement = button.closest(".book");
      if (bookElement) {
        bookElement.classList.toggle("flipped");
      }
    });
  });
}

// =============================================
// Function to handle quantity input changes
// =============================================
/**
 * Initializes quantity selectors and add-to-cart buttons for all books.
 * Uses event delegation to avoid duplicate listeners.
 */
function initQuantitySelectors() {
  // Use event delegation for quantity selectors (parent container)
  const bookTemplate = document.querySelector(SELECTORS.bookTemplate);
  if (!bookTemplate) return;

  // Event delegation for quantity selector buttons (decrement/increment)
  bookTemplate.addEventListener("click", (e) => {
    // Handle decrement button clicks
    if (e.target.closest(".decrement")) {
      e.stopPropagation();
      const selector = e.target.closest(".quantity-selector");
      const input = selector?.querySelector(".quantity-input");
      let currentValue = parseInt(input.value);
      if (input && currentValue > 0) {
        input.value = currentValue - 1;
        updateAddButtonState(input);
      }
    }
    // Handle increment button clicks
    else if (e.target.closest(".increment")) {
      e.stopPropagation();
      const selector = e.target.closest(".quantity-selector");
      const input = selector?.querySelector(".quantity-input");
      let currentValue = parseInt(input.value);
      if (input) {
        const maxStock = parseInt(input.max);
        if (currentValue < maxStock) {
          input.value = currentValue + 1;
          updateAddButtonState(input);
        }
      }
    }
  });

  // Event delegation for add-to-cart buttons
  bookTemplate.addEventListener("click", (e) => {
    if (e.target.closest(".add-to-cart")) {
      e.stopPropagation();
      const button = e.target.closest(".add-to-cart");
      const bookId = button.dataset.id;
      const input = bookTemplate.querySelector(
        `.quantity-input[data-id="${bookId}"]`,
      );
      if (!input) return;

      const quantity = parseInt(input.value) || 0;
      //Handles non-numeric input
      if (isNaN(quantity)) return;

      if (quantity <= 0) {
        showNotification("Please enter a valid quantity.", "error");
        return;
      }

      const bookData = STATE.allBooks.find((item) => item.book.ISBN === bookId);
      if (!bookData) {
        showNotification("Book not found.", "error");
        return;
      }

      if (bookData.book.stock < quantity) {
        showNotification(
          `Insufficient stock. Max available: ${bookData.book.stock}.`,
          "error",
        );
        input.value = bookData.book.stock;
        updateAddButtonState(input);
        return;
      }

      // Check if book is already in cart
      const existingItemIndex = STATE.cart.findIndex(
        (item) => item.id === bookId,
      );
      if (existingItemIndex !== -1) {
        const oldQuantity = STATE.cart[existingItemIndex].quantity;
        STATE.cart[existingItemIndex].quantity = oldQuantity + quantity;
        // Adjust stock accordingly
        updateStock(bookId, -quantity);
      } else {
        // Add new item to cart
        STATE.cart.push({
          id: bookId,
          title: input.dataset.title,
          coverSrc: bookData.book.cover?.src || "#",
          coverAlt: bookData.book.cover?.alt || "Book cover",
          quantity: quantity,
        });
        updateStock(bookId, -quantity);
      }

      saveCartToStorage();
      updateCartUI();
      input.value = 1; // Reset to 1 for next addition
      updateAddButtonState(input);
    }
  });
}

/**
 * Updates the state of the "Add to Cart" button based on the input value.
 * @param {HTMLElement} input - The quantity input element.
 */
function updateAddButtonState(input) {
  const bookId = input.dataset.id;
  const quantity = parseInt(input.value) || 0;
  const maxStock = parseInt(input.max);
  const addButton = document.querySelector(`.add-to-cart[data-id="${bookId}"]`);

  if (addButton) {
    addButton.disabled = quantity <= 0 || quantity > maxStock;
  }
}

// =============================================
// 6. FILTERING FUNCTIONS
// =============================================
/**
 * Initializes all filters
 * @param {Array} library - Array of book objects
 */
function initFilters(library) {
  initGenreFilter(library);
  initStockFilter();
  initLocationFilter();
}

function initGenreFilter(library) {
  const genreFilter = document.querySelector(SELECTORS.genreFilter);
  if (!genreFilter) return;

  const genres = [
    ...new Set(library.map((item) => item.book?.genre).filter(Boolean)),
  ];
  genreFilter.innerHTML =
    '<option value="select">Tous les genres</option>' +
    genres
      .map((genre) => `<option value="${genre}">${genre}</option>`)
      .join("");

  genreFilter.addEventListener("change", (e) => {
    STATE.filters.genre = e.target.value;
    applyFilters();
  });
}

function initStockFilter() {
  const stockFilter = document.querySelector(SELECTORS.stockFilter);
  if (!stockFilter) return;

  stockFilter.innerHTML = `
    <option value="all">Tous les stocks</option>
    <option value="in-stock">En stock</option>
    <option value="low-stock">Stock faible (&leq;5)</option>
    <option value="out-of-stock">Rupture de stock</option>
  `;

  stockFilter.addEventListener("change", (e) => {
    STATE.filters.stock = e.target.value;
    applyFilters();
  });
}

function initLocationFilter() {
  const locationFilter = document.querySelector(SELECTORS.locationFilter);
  locationFilter?.addEventListener("input", (e) => {
    STATE.filters.location = e.target.value.toLowerCase();
    applyFilters();
  });
}

/**
 * Applies all filters to the book list
 */
function applyFilters() {
  const filteredBooks = STATE.allBooks.filter((bookItem) => {
    const book = bookItem.book;

    // Genre filter
    if (
      STATE.filters.genre !== "select" &&
      book.genre !== STATE.filters.genre
    ) {
      return false;
    }

    // Stock filter
    if (STATE.filters.stock !== "all") {
      const stock = book.stock || 0;
      if (STATE.filters.stock === "in-stock" && stock <= 0) return false;
      if (STATE.filters.stock === "low-stock" && (stock <= 0 || stock > 5))
        return false;
      if (STATE.filters.stock === "out-of-stock" && stock > 0) return false;
    }

    // Location filter
    if (
      STATE.filters.location &&
      !book.location?.toLowerCase().includes(STATE.filters.location)
    ) {
      return false;
    }

    return true;
  });

  renderBooks(filteredBooks);
  updateFilterCounters(filteredBooks);
}

/**
 * Updates filter counters in the UI
 * @param {Array} filteredBooks - Array of filtered book objects
 */
function updateFilterCounters(filteredBooks) {
  const genre = STATE.filters.genre;
  const stock = STATE.filters.stock;
  const location = STATE.filters.location;

  if (genre !== "select") {
    updateCounter(
      "available-book-genre",
      `${filteredBooks.length} livres dans le genre ${genre}`,
    );
  } else {
    hideCounter("available-book-genre");
  }

  if (stock !== "all") {
    updateCounter(
      "available-book-stock",
      `${filteredBooks.length} livres avec le statut "${stock}"`,
    );
  } else {
    hideCounter("available-book-stock");
  }

  if (location) {
    updateCounter(
      "available-book-location",
      `${filteredBooks.length} livres à l'emplacement "${location}"`,
    );
  } else {
    hideCounter("available-book-location");
  }
}

/**
 * Updates a counter element in the UI
 * @param {string} elementId - ID of the counter element
 * @param {string} text - Text to display
 */
function updateCounter(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
    element.style.display = "flex";
  }
}

function hideCounter(elementId) {
  const element = document.getElementById(elementId);
  if (element) element.style.display = "none";
}

// =============================================
// 7. SHOPPING CART FUNCTIONS
// =============================================
function initShoppingCart() {
  const list = document.querySelector(SELECTORS.list);
  const shoppingList = document.querySelector(SELECTORS.shoppingList);

  if (!list || !shoppingList) return;

  // Load saved cart from localStorage
  loadCartFromStorage();

  // Set up click listener for delete buttons (event delegation)
  list.addEventListener("click", (e) => {
    const deleteButton = e.target.closest(SELECTORS.deleteBook);
    if (!deleteButton) return;

    const listItem = deleteButton.closest("li");
    const bookId = listItem.querySelector(SELECTORS.coverPurchase)?.dataset.id;
    if (bookId) {
      removeFromCartById(bookId);
      // Reset the quantity input for this book
      const input = document.querySelector(
        `.quantity-input[data-id="${bookId}"]`,
      );
      if (input) {
        input.value = 1;
      }
    }
  });

  // Add clear cart button
  const clearCartButton = document.querySelector("#clear-cart-button");
  if (clearCartButton) {
    clearCartButton.addEventListener("click", () => {
      if (confirm("Vider votre panier ?")) {
        clearCart();
      }
    });
  }

  // Set up export button
  document
    .querySelector(SELECTORS.exportCsv)
    ?.addEventListener("click", exportToCSV);
}

function removeFromCartById(bookId) {
  const itemIndex = STATE.cart.findIndex((item) => item.id === bookId);
  if (itemIndex !== -1) {
    const quantity = STATE.cart[itemIndex].quantity;
    // Update stock
    updateStock(bookId, quantity);
    // Remove from cart
    STATE.cart.splice(itemIndex, 1);
    // Save to localStorage
    saveCartToStorage();
    // Update UI
    updateCartUI();
  }
}

function updateCartUI() {
  const list = document.querySelector(SELECTORS.list);
  const shoppingList = document.querySelector(SELECTORS.shoppingList);
  const shoppingListHeading = document.querySelector(
    SELECTORS.shoppingListHeading,
  );

  if (!list || !shoppingList || !shoppingListHeading) return;

  // Update cart list
  list.innerHTML = STATE.cart
    .map(
      (item) => `
    <li class="cart-item">
      <img src="${item.coverSrc}" alt="${item.coverAlt}" class="cover-purchase" data-id="${item.id}">
      <div class="cart-item-details">
        <b><span class="title">${item.title}</span></b>
        <span class="cart-item-quantity">x${item.quantity}</span>
      </div>
      <span class="delete-book">✕</span>
    </li>
  `,
    )
    .join("");

  // Update counter
  const totalItems = STATE.cart.reduce((sum, item) => sum + item.quantity, 0);
  shoppingListHeading.textContent = `${totalItems} livres en liste d'achats`;

  // Show/hide shopping list
  shoppingList.classList.toggle("show", STATE.cart.length > 0);

  // Reset quantity inputs for books not in cart
  document.querySelectorAll(".quantity-input").forEach((input) => {
    const bookId = input.dataset.id;
    const isInCart = STATE.cart.some((item) => item.id === bookId);
    if (!isInCart) {
      input.value = 1;
    }
  });
}

function clearCart() {
  STATE.cart = [];
  saveCartToStorage();
  updateCartUI();

  // Restore original stock
  const originalStock = JSON.parse(
    localStorage.getItem("original-stock") || "{}",
  );
  STATE.allBooks.forEach((item) => {
    if (originalStock[item.book.ISBN] !== undefined) {
      item.book.stock = originalStock[item.book.ISBN];
    }
  });
  updateTotalBooksInStock();
  catalogueTotalBooks();

  // Clear original stock if needed (optional)
  localStorage.removeItem("original-stock");
}
// =============================================
// 8. STOCK MANAGEMENT
// =============================================
/**
 * Updates the stock of a specific book
 * @param {string} bookId - ISBN of the book
 * @param {number} change - Amount to add (positive) or subtract (negative) from stock
 * @returns {boolean} True if successful, false otherwise
 */
function updateStock(bookId, change) {
  const bookIndex = STATE.allBooks.findIndex(
    (item) => item.book.ISBN === bookId,
  );
  if (bookIndex === -1) {
    showNotification(`Book with ID ${bookId} not found.`, "error");
    return false;
  }

  const newStock = (STATE.allBooks[bookIndex].book.stock || 0) + change;

  if (newStock < 0) {
    showNotification(
      `Insufficient stock for "${STATE.allBooks[bookIndex].book.title}".`,
      "error",
    );
    return false;
  }

  STATE.allBooks[bookIndex].book.stock = newStock;

  // Update the specific book element in the DOM
  const bookElement = document.querySelector(`[data-id="${bookId}"]`);
  if (bookElement) {
    const book = STATE.allBooks[bookIndex].book;
    const stockStatus = getStockStatus(book.stock);
    const stockClass = getStockClass(book.stock);

    // Update stock display
    const stockElement = bookElement.querySelector(".stock");
    if (stockElement) {
      stockElement.textContent = stockStatus;
      stockElement.className = `stock ${stockClass}`;
    }

    // Update quantity input max and value
    const quantityInput = bookElement.querySelector(".quantity-input");
    if (quantityInput) {
      quantityInput.max = book.stock;
      let value = parseInt(quantityInput.value) || 0;
      if (value > book.stock) {
        quantityInput.value = book.stock;
      }
    }

    // Update data-stock attribute
    bookElement.dataset.stock = book.stock;
    bookElement.className = `book ${stockClass}`; // Update book class for styling
  }

  updateTotalBooksInStock();
  catalogueTotalBooks();
  return true;
}

function updateTotalBooksInStock() {
  const totalInStock = STATE.allBooks.reduce(
    (total, item) => total + (item.book.stock || 0),
    0,
  );

  const totalBooksElement = document.querySelector(
    SELECTORS.availableBooksHeading,
  );
  if (totalBooksElement) {
    totalBooksElement.textContent = `${totalInStock} unités en stock`;
  }
}

function catalogueTotalBooks() {
  const catalogueTotal = STATE.allBooks.filter((item) => item.book.stock > 0);

  const catalogueHeading = document.querySelector(
    SELECTORS.catalogueTotalHeading,
  );
  if (catalogueHeading) {
    catalogueHeading.textContent = `${catalogueTotal.length} livres en catalogue`;
  }
}

// =============================================
// 9. LOCAL STORAGE MANAGEMENT
// =============================================
function saveCartToStorage() {
  if (!storageAvailable("localStorage")) return;
  localStorage.setItem("library-cart", JSON.stringify(STATE.cart));
}

function loadCartFromStorage() {
  if (!storageAvailable("localStorage")) return;

  const savedCart = localStorage.getItem("library-cart");
  if (!savedCart) return;

  // Restore original stock from localStorage
  const originalStock = JSON.parse(
    localStorage.getItem("original-stock") || "{}",
  );
  STATE.allBooks.forEach((item) => {
    if (originalStock[item.book.ISBN] !== undefined) {
      item.book.stock = originalStock[item.book.ISBN];
    }
  });

  STATE.cart = JSON.parse(savedCart);

  // Update stock according to cart
  STATE.cart.forEach((cartItem) => {
    const bookExists = STATE.allBooks.some(
      (item) => item.book.ISBN === cartItem.id,
    );
    if (bookExists) {
      updateStock(cartItem.id, -cartItem.quantity);
    }
  });

  updateCartUI();
}

/**
 * Checks if localStorage is available
 * @param {string} type - Type of storage to check
 * @returns {boolean} True if available, false otherwise
 */
function storageAvailable(type) {
  try {
    const storage = window[type];
    const testKey = "__storage_test__";
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" ||
        e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
      storage &&
      storage.length !== 0
    );
  }
}

// =============================================
// 10. EXPORT FUNCTIONS
// =============================================
/**
 * Exports the shopping cart to a CSV file
 */
function exportToCSV() {
  if (STATE.cart.length === 0) {
    showNotification("Votre liste d'achats est vide.", "error");
    return;
  }

  const headers = ["Title", "Author", "Genre", "Price", "Location", "Supplier"];
  const rows = STATE.cart
    .map((cartItem) => {
      const book = STATE.allBooks.find(
        (item) => item.book.ISBN === cartItem.id,
      )?.book;
      if (!book) return [];

      return [
        book.title || "N/A",
        book.author?.name || "N/A",
        book.genre || "N/A",
        book.price?.toFixed(2) || "N/A",
        book.location || "N/A",
        book.supplier || "N/A",
      ];
    })
    .filter((row) => row.length > 0);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((field) => `"${field}"`).join(",")),
  ].join("\n");

  downloadCSV(csvContent, "shopping_list_export.csv");
}

/**
 * Downloads a CSV file
 * @param {string} content - CSV content
 * @param {string} filename - Name of the file to download
 */
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =============================================
// 11. NOTIFICATIONS
// =============================================
/**
 * Shows a notification message
 * @param {string} message - Message to display
 * @param {string} type - Type of notification ("error")
 */
function showNotification(message, type = "error") {
  const modal = document.querySelector(".modal");

  modal.innerHTML = `
  <div class="modal-content ${type}">
    <p>${message}</p>
    <span class="close">&times;</span>
  </div>
  `;
  modal.style.display = "block";

  closeNotification();
}

function closeNotification() {
  const span = document.querySelector(".close");
  const modal = document.querySelector(".modal");

  span.onclick = function () {
    modal.style.display = "none";
  };

  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };
}

module.exports = {
  STATE,
  normalizeBookData,
  updateStock,
  initQuantitySelectors,
  removeFromCartById,
  applyFilters,
  getStockStatus,
  getStockClass,
  loadCartFromStorage,
  saveCartToStorage,
  clearCart,
};
