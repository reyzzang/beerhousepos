// products.js - Central database of all hardcoded items

export const categories = [
  {
    id: 'beers',
    name: 'ლუდები',
    items: [
      { id: 'kazbegi', name: 'ყაზბეგი', price: 5.00, unit: 'ლიტრი', type: 'liter', multipliers: [1, 2, 3, 6] },
      { id: 'shavi_lomi', name: 'შავი ლომი', price: 7.00, unit: 'ლიტრი', type: 'liter', multipliers: [1, 2, 3, 6] },
      { id: 'efes', name: 'EFES', price: 5.80, unit: 'ლიტრი', type: 'liter', multipliers: [1, 2, 3, 6] },
      { id: 'lowenbrau', name: 'LOWENBRAU', price: 5.80, unit: 'ლიტრი', type: 'liter', multipliers: [1, 2, 3, 6] },
      { id: 'staropramen', name: 'Staropramen', price: 6.00, unit: 'ლიტრი', type: 'liter', multipliers: [1, 2, 3, 6] },
      { id: 'alpenbrau', name: 'Alpenbrau', price: 4.00, unit: 'ლიტრი', type: 'liter', multipliers: [1, 2, 3, 6] },
      { id: 'katkha', name: 'კათხა', price: 3.90, unit: 'ლიტრი', type: 'liter', multipliers: [1, 2, 3, 6] },
      { id: 'kasris', name: 'კასრის', price: 3.80, unit: 'ლიტრი', type: 'liter', multipliers: [1, 2, 3, 6] },
      { id: '12_martsvali', name: '12 მარცვალი', price: 6.00, unit: 'ლიტრი', type: 'liter', multipliers: [1, 2, 3, 6] },
      { id: 'tsiv_tsivi', name: 'ცივ ცივი', price: 5.00, unit: 'ლიტრი', type: 'liter', multipliers: [1, 2, 3, 6] },
      { id: 'taati', name: 'ტაატი', price: 6.50, unit: 'ლიტრი', type: 'liter', multipliers: [1, 2, 3, 6] }
    ]
  },
  {
    id: 'fish',
    name: 'თევზი',
    items: [
      { id: 'siga', name: 'სიგა 1 ცალი', price: 7.00, unit: 'ცალი', type: 'piece' },
      { id: 'anchousi_patara', name: '1 ცალი ანჩოუსი(პატარა)', price: 3.50, unit: 'ცალი', type: 'piece' },
      { id: 'anchousi_didi', name: '1 ცალი ანჩოუსი(დიდი)', price: 4.50, unit: 'ცალი', type: 'piece' },
      { id: 'tarani', name: 'ტარანი', price: 30.00, unit: 'კგ', type: 'weight' },
      { id: 'siomg_anatali', name: 'სიომგის ანათალი', price: 30.00, unit: 'კგ', type: 'weight' },
      { id: 'khamsa', name: 'ხამსა', price: 21.00, unit: 'კგ', type: 'weight' },
      { id: 'skumbria', name: 'სკუმბრია', price: 32.00, unit: 'კგ', type: 'weight' },
      { id: 'generali', name: 'გენერალი', price: 33.00, unit: 'კგ', type: 'weight' },
      { id: 'lesha', name: 'ლეშა', price: 30.00, unit: 'კგ', type: 'weight' },
      { id: 'satali', name: 'სათალი', price: 50.00, unit: 'კგ', type: 'weight' },
      { id: 'stavrida', name: 'სტავრიდა', price: 30.00, unit: 'კგ', type: 'weight' },
      { id: 'dorado', name: 'დორადო', price: 35.00, unit: 'კგ', type: 'weight' },
      { id: 'barabulka', name: 'ბარაბულკა', price: 31.00, unit: 'კგ', type: 'weight' }
    ]
  },
  {
    id: 'meat',
    name: 'ხორცი',
    items: [
      { id: 'neknebi', name: 'ნეკნები', price: 33.00, unit: 'კგ', type: 'weight' },
      { id: 'sheika', name: 'შეიკა', price: 34.00, unit: 'კგ', type: 'weight' },
      { id: 'sosisi_spetsi', name: 'სოსისი სპეცი', price: 24.00, unit: 'კგ', type: 'weight' },
      { id: 'monadireuli_sosisi', name: 'მონადირული სოსისი', price: 19.00, unit: 'კგ', type: 'weight' }
    ]
  },
  {
    id: 'sauces',
    name: 'სოუსები',
    items: [
      { id: 'mdogvi', name: 'მდოგვი 1ც', price: 2.00, unit: 'ცალი', type: 'piece' },
      { id: 'ajika', name: 'აჯიკა 1ც', price: 2.00, unit: 'ცალი', type: 'piece' }
    ]
  },
  {
    id: 'cheese',
    name: 'ყველი',
    items: [
      { id: 'sulguni_didi', name: 'შებოლილი სულგუნი დიდი', price: 4.50, unit: 'ცალი', type: 'piece' },
      { id: 'sulguni_patara', name: 'სულგუნი პატარა', price: 3.50, unit: 'ცალი', type: 'piece' }
    ]
  },
  {
    id: 'bread',
    name: 'პური',
    items: [
      { id: 'shavi_puri', name: '1ცალი შავი პური', price: 1.80, unit: 'ცალი', type: 'piece' }
    ]
  },
  {
    id: 'chips',
    name: 'ჩიფსები და კრეკერები',
    items: [
      { id: 'nivriani_krekeri', name: 'ნივრიანი კრეკერი', price: 4.50, unit: 'ცალი', type: 'piece' },
      { id: 'brusketi_mareti', name: 'ბრუსკეტი მარეტი', price: 4.50, unit: 'ცალი', type: 'piece' },
      { id: 'big_bobi', name: 'ბიგ ბობი', price: 2.50, unit: 'ცალი', type: 'piece' },
      { id: 'flinti', name: 'ფლინტი', price: 2.50, unit: 'ცალი', type: 'piece' }
    ]
  },
  {
    id: 'coca_cola',
    name: 'კოკა-კოლა',
    items: [
      { id: 'kola_kila', name: '1 ქილა კოლა', price: 1.80, unit: 'ცალი', type: 'piece' },
      { id: 'berni', name: '1 ბერნი', price: 2.00, unit: 'ცალი', type: 'piece' },
      { id: 'kola_klasiki', name: '1 კოლა კლასიკი', price: 1.80, unit: 'ცალი', type: 'piece' },
      { id: 'kola_alublis', name: '1 კოლა ალუბლის', price: 1.80, unit: 'ცალი', type: 'piece' },
      { id: 'kola_zero', name: '1 კოლა ზერო', price: 1.80, unit: 'ცალი', type: 'piece' },
      { id: 'fanta', name: '1 ფანტა', price: 1.80, unit: 'ცალი', type: 'piece' },
      { id: 'fanta_tropiki', name: '1 ფანტა ტროპიკი', price: 1.80, unit: 'ცალი', type: 'piece' },
      { id: 'sprite', name: '1 სპრაიტი', price: 1.80, unit: 'ცალი', type: 'piece' },
      { id: 'kapi_palpi', name: '1 კაპი-პალპი', price: 2.80, unit: 'ცალი', type: 'piece' },
      { id: 'kapi_palpi_alublis', name: '1 კაპი-პალპი (ალუბლის)', price: 2.80, unit: 'ცალი', type: 'piece' },
      { id: 'tsivi_chai', name: '1 ცივი ჩაი ბოთლის', price: 2.20, unit: 'ცალი', type: 'piece' },
      { id: 'tsivi_chai_qila', name: '1 ცივი ჩაი (ქილის)', price: 2.50, unit: 'ცალი', type: 'piece' },
      { id: 'tsqali_mtis', name: '1 წყალი მთის', price: 0.70, unit: 'ცალი', type: 'piece' }
    ]
  },
  {
    id: 'nabeghlavi',
    name: 'ნაბეღლავი',
    items: [
      { id: 'bugha_didi', name: '1 ბუღა დიდი', price: 2.00, unit: 'ცალი', type: 'piece' },
      { id: 'bugha_mohito', name: '1 ბუღა მოჰიტო', price: 2.00, unit: 'ცალი', type: 'piece' },
      { id: 'bugha_patara', name: '1 ბუღა პატარა', price: 1.60, unit: 'ცალი', type: 'piece' },
      { id: 'bravo', name: '1 ბრავო', price: 2.50, unit: 'ცალი', type: 'piece' },
      { id: 'naturaluri_tsveni', name: '1 ნატურალური წვენი', price: 3.80, unit: 'ცალი', type: 'piece' },
      { id: 'tsivi_qava', name: '1 ცივი ყავა', price: 5.50, unit: 'ცალი', type: 'piece' },
      { id: 'yupi', name: '1 იუპი', price: 2.50, unit: 'ცალი', type: 'piece' },
      { id: 'nabeghlavi_patara', name: '1 ნაბეღლავი პატარა', price: 1.60, unit: 'ცალი', type: 'piece' },
      { id: 'nabeghlavi_didi', name: '1 ნაბეღლავი დიდი', price: 2.00, unit: 'ცალი', type: 'piece' }
    ]
  },
  {
    id: 'cups',
    name: 'ჭიქები',
    items: [
      { id: 'plastmasis_chikha', name: '1 ცალი პლასტმასის ჭიქა', price: 0.20, unit: 'ცალი', type: 'piece' }
    ]
  }
];

export function getCustomProducts() {
  try {
    return JSON.parse(localStorage.getItem('customProducts') || '[]');
  } catch (e) {
    return [];
  }
}

export function getAllProducts() {
  const all = [];
  categories.forEach(cat => {
    cat.items.forEach(item => {
      all.push({ ...item, categoryId: cat.id, categoryName: cat.name });
    });
  });
  getCustomProducts().forEach(cp => {
    if (!all.find(p => p.id === cp.id)) {
      all.push({
        ...cp,
        categoryId: cp.categoryId || 'other',
        categoryName: cp.categoryName || 'სხვა'
      });
    }
  });
  return all;
}

export function getProductById(id) {
  for (const cat of categories) {
    const found = cat.items.find(i => i.id === id);
    if (found) return { ...found, categoryId: cat.id, categoryName: cat.name };
  }
  const custom = getCustomProducts().find(p => p.id === id);
  if (custom) {
    return {
      ...custom,
      categoryId: custom.categoryId || 'other',
      categoryName: custom.categoryName || 'სხვა'
    };
  }
  return null;
}

export function getCategoryById(id) {
  return categories.find(c => c.id === id) || null;
}

export function getCategoriesWithCustom() {
  const cats = categories.map(c => ({
    id: c.id,
    name: c.name,
    items: [...c.items]
  }));
  const custom = getCustomProducts();
  if (custom.length > 0) {
    cats.push({
      id: 'other',
      name: 'სხვა / დამატებითი',
      items: custom.map(cp => ({
        ...cp,
        multipliers: cp.type === 'liter' ? [1, 2, 3, 6] : undefined
      }))
    });
  }
  return cats;
}

// Initial stock
export const initialStock = {};
getAllProducts().forEach(p => {
  initialStock[p.id] = 100;
});

// Distributors - Beer distributors updated per your specification
export const distributors = [
  {
    id: 'ludis',
    name: 'ყაზბეგი',
    products: ['ყაზბეგი', 'შავი ლომი', 'ტაატი']
  },
  {
    id: 'natakhtari',
    name: 'ნატახტარი',
    products: ['EFES', 'LOWENBRAU', 'Staropramen', 'Alpenbrau', 'კათხა', 'კასრის']
  },
  {
    id: 'zedazeni',
    name: 'ზედაზენი',
    products: ['12 მარცვალი', 'ცივ ცივი']
  },
  {
    id: 'tevzis',
    name: 'თევზის',
    products: ['ყველა თევზი ანჩოუსების გარდა']
  },
  {
    id: 'gemrieli',
    name: 'გემრიელი (ხორცი)',
    products: ['ლორი', 'ნეკნები', 'სოსისები']
  },
  {
    id: 'big_bob',
    name: 'Big Bob',
    products: ['ანჩოუსები', 'ფლინტი', 'ბიგ ბობი', 'სულგუნები']
  },
  {
    id: 'coca_cola',
    name: 'Coca-Cola',
    products: ['კოლა', 'ბერნი', 'სპრაიტი', 'ფანტა', 'წყალი მთის', 'კაპი პალპი', 'ცივი ჩაი']
  },
  {
    id: 'nabeghlavi',
    name: 'ნაბეღლავი',
    products: ['ბუღა', 'ბუღა მოჰიტო', 'ბრავო', 'ნატურალური წვენი', 'ცივი ყავა', 'იუპი', 'ნაბეღლავი']
  }
];