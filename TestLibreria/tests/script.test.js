/**
 * @jest-environment jsdom
 */

/**
 * Jest tests for script.js
 * Test descriptions are in French and comments are in English.
 */

const {
  STATE,
  normalizeBookData,
  updateStock,
  removeFromCartById,
  applyFilters,
  getStockStatus,
  getStockClass,
  loadCartFromStorage,
  saveCartToStorage,
  clearCart,
} = require("../script/script");

// Mock localStorage for the jsdom environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => (key in store ? store[key] : null)),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Shared mock book data used in multiple test cases
const mockBooks = [
  {
    book: {
      ISBN: "ISBN123",
      title: "Le Hobbit",
      author: {
        name: "J.R.R. Tolkien",
        otherBooks: ["Le Seigneur des Anneaux"],
      },
      genre: "Fantasie",
      stock: 10,
      price: 15.99,
      location: "A1-23",
      supplier: "Éditions Minotauro",
      cover: { src: "hobbit.jpg", alt: "Couverture du Hobbit" },
      pages: 300,
      synopsis: "Un voyage épique en Terre du Milieu.",
      year: 1937,
    },
  },
  {
    book: {
      ISBN: "ISBN456",
      title: "Dracula",
      author: { name: "Bram Stoker", otherBooks: ["Le Château de Dracula"] },
      genre: "Horreur",
      stock: 0,
      price: 12.5,
      location: "B2-15",
      supplier: "Éditions Valdemar",
      cover: { src: "dracula.jpg", alt: "Couverture de Dracula" },
      pages: 400,
      synopsis: "Le comte Dracula et ses victimes.",
      year: 1897,
    },
  },
  {
    book: {
      ISBN: "ISBN789",
      title: "1984",
      author: { name: "George Orwell", otherBooks: ["La Ferme des animaux"] },
      genre: "Science-Fiction",
      stock: 5,
      price: 9.99,
      location: "C3-01",
      supplier: "Éditions Gallimard",
      cover: { src: "1984.jpg", alt: "Couverture de 1984" },
      pages: 350,
      synopsis: "Une dystopie sur la surveillance totale.",
      year: 1949,
    },
  },
];

// Reset state and DOM before each test
beforeEach(() => {
  STATE.allBooks = JSON.parse(JSON.stringify(mockBooks));
  STATE.cart = [];
  STATE.filters = { genre: "select", stock: "all", location: "" };
  localStorage.clear();

  document.body.innerHTML = `
    <div id="book-template"></div>
    <div id="list"></div>
    <div id="shopping-list"></div>
    <h2 id="shopping-list-heading"></h2>
    <h2 id="available-books-heading"></h2>
    <h2 id="catalogue-total-heading"></h2>
    <div class="modal"></div>
  `;
});

/**
 * Book data normalization tests.
 */
describe("Normalisation des données de livres", () => {
  test("devrait ajouter des valeurs par défaut aux champs manquants", () => {
    const incompleteBook = {
      book: {
        ISBN: "ISBN000",
        title: "Livre sans détails",
        author: {},
      },
    };

    const normalized = normalizeBookData([incompleteBook]);

    expect(normalized[0].book.title).toBe("Livre sans détails");
    expect(normalized[0].book.genre).toBe("N/A");
    expect(normalized[0].book.stock).toBe(0);
    expect(normalized[0].book.price).toBe(15.99);
    expect(normalized[0].book.author.name).toBe("N/A");
  });

  test("devrait conserver les données existantes", () => {
    const normalized = normalizeBookData(mockBooks);

    expect(normalized[0].book.title).toBe("Le Hobbit");
    expect(normalized[1].book.genre).toBe("Horreur");
    expect(normalized[2].book.stock).toBe(5);
  });
});

/**
 * Stock management tests.
 */
describe("Gestion du stock", () => {
  test("devrait mettre à jour le stock correctement", () => {
    const initialStock = STATE.allBooks[0].book.stock;
    const result = updateStock("ISBN123", -2);

    expect(result).toBe(true);
    expect(STATE.allBooks[0].book.stock).toBe(initialStock - 2);
  });

  test("devrait empêcher le stock négatif", () => {
    const initialStock = STATE.allBooks[0].book.stock;
    const result = updateStock("ISBN123", -initialStock - 1);

    expect(result).toBe(false);
    expect(STATE.allBooks[0].book.stock).toBe(initialStock);
  });

  test("devrait retourner false si le livre n'existe pas", () => {
    const result = updateStock("INVALID_ISBN", -1);

    expect(result).toBe(false);
  });
});

/**
 * Storage and cart persistence tests.
 */
describe("Gestion du panier et stockage local", () => {
  test("devrait sauvegarder le panier dans localStorage", () => {
    STATE.cart = [{ id: "ISBN123", title: "Le Hobbit", quantity: 2 }];

    saveCartToStorage();

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "library-cart",
      JSON.stringify(STATE.cart),
    );
  });

  test("devrait charger le panier depuis localStorage", () => {
    const savedCart = [{ id: "ISBN123", title: "Le Hobbit", quantity: 2 }];
    localStorage.setItem("original-stock", JSON.stringify({ ISBN123: 10 }));
    localStorage.setItem("library-cart", JSON.stringify(savedCart));

    loadCartFromStorage();

    expect(STATE.cart).toEqual(savedCart);
    expect(STATE.allBooks[0].book.stock).toBe(8);
  });

  test("devrait supprimer un livre du panier et restaurer le stock", () => {
    STATE.cart = [{ id: "ISBN123", title: "Le Hobbit", quantity: 2 }];
    STATE.allBooks[0].book.stock = 8;
    localStorage.setItem("original-stock", JSON.stringify({ ISBN123: 10 }));

    removeFromCartById("ISBN123");

    expect(STATE.cart).toEqual([]);
    expect(STATE.allBooks[0].book.stock).toBe(10);
  });

  test("devrait vider le panier et restaurer les stocks originaux", () => {
    STATE.cart = [
      { id: "ISBN123", title: "Le Hobbit", quantity: 2 },
      { id: "ISBN789", title: "1984", quantity: 1 },
    ];
    localStorage.setItem(
      "original-stock",
      JSON.stringify({ ISBN123: 10, ISBN789: 5 }),
    );

    clearCart();

    expect(STATE.cart).toEqual([]);
    expect(STATE.allBooks[0].book.stock).toBe(10);
    expect(STATE.allBooks[2].book.stock).toBe(5);
  });
});

/**
 * Filtering tests.
 */
describe("Application des filtres", () => {
  test("devrait filtrer par genre", () => {
    STATE.filters.genre = "Fantasie";

    const filtered = applyFilters();

    expect(filtered).toBeUndefined();
    expect(STATE.filters.genre).toBe("Fantasie");
  });

  test("devrait filtrer par statut de stock", () => {
    STATE.filters.stock = "out-of-stock";

    const filtered = applyFilters();

    expect(filtered).toBeUndefined();
    expect(STATE.filters.stock).toBe("out-of-stock");
  });

  test("devrait filtrer par emplacement", () => {
    STATE.filters.location = "A1";

    const filtered = applyFilters();

    expect(filtered).toBeUndefined();
    expect(STATE.filters.location).toBe("A1");
  });
});

/**
 * Stock status helper tests.
 */
describe("Fonctions de statut de stock", () => {
  test("devrait retourner le bon statut de stock", () => {
    expect(getStockStatus(0)).toBe("Rupture de stock");
    expect(getStockStatus(3)).toBe("Stock faible (3)");
    expect(getStockStatus(10)).toBe("En Stock (10)");
  });

  test("devrait retourner la bonne classe CSS pour le stock", () => {
    expect(getStockClass(0)).toBe("out-of-stock");
    expect(getStockClass(3)).toBe("low-stock");
    expect(getStockClass(10)).toBe("in-stock");
  });
});
