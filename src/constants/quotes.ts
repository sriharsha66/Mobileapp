export interface QuoteItem {
  id: string;
  text: string;
  icon: string;
  color: string;
  category: string;
}

export const quoteFavKey = (userId: string) => `@medvault_quote_favorites_${userId}`;

export const ALL_QUOTES: QuoteItem[] = [
  { id: 'q01', text: 'Drink at least 8 glasses of water daily. Your body is 70% water — keep it flowing.', icon: '💧', color: '#039BE5', category: 'Hydration' },
  { id: 'q02', text: 'Eat the rainbow every day. Colourful vegetables mean diverse nutrients your body needs.', icon: '🥗', color: '#43A047', category: 'Nutrition' },
  { id: 'q03', text: 'Turmeric with black pepper is one of nature\'s most powerful anti-inflammatory combinations.', icon: '🌿', color: '#FB8C00', category: 'Superfoods' },
  { id: 'q04', text: 'A handful of nuts daily reduces the risk of heart disease by up to 30%.', icon: '🥜', color: '#8D6E63', category: 'Heart Health' },
  { id: 'q05', text: 'Replace white rice with millets or brown rice. Your blood sugar will stay steadier all day.', icon: '🌾', color: '#00897B', category: 'Blood Sugar' },
  { id: 'q06', text: 'Garlic is nature\'s antibiotic. Add it raw or lightly cooked to your daily meals.', icon: '🧄', color: '#5E35B1', category: 'Superfoods' },
  { id: 'q07', text: 'Eat fatty fish like salmon or mackerel twice a week. Omega-3s protect your brain and heart.', icon: '🐟', color: '#1565C0', category: 'Omega-3' },
  { id: 'q08', text: 'Fermented foods like curd, idli and dosa strengthen your gut and boost your immunity naturally.', icon: '🥛', color: '#43A047', category: 'Gut Health' },
  { id: 'q09', text: 'Breakfast fuels your brain. Skipping it lowers focus, memory and energy for the entire day.', icon: '🍳', color: '#FB8C00', category: 'Meals' },
  { id: 'q10', text: 'Broccoli, spinach and kale contain iron and folate — eat them 3 times a week.', icon: '🥦', color: '#2E7D32', category: 'Greens' },
  { id: 'q11', text: 'Excess salt raises blood pressure silently. Season your food with herbs and spices instead.', icon: '🧂', color: '#E53935', category: 'Blood Pressure' },
  { id: 'q12', text: 'Sugar feeds inflammation. Replace sweets with fruits, dates or a small piece of dark chocolate.', icon: '🍬', color: '#D81B60', category: 'Sugar' },
  { id: 'q13', text: 'A 30-minute walk after dinner can reduce your blood sugar levels significantly.', icon: '🚶', color: '#00897B', category: 'Exercise' },
  { id: 'q14', text: 'Lentils and legumes are the best plant-based protein — affordable, filling, and heart-healthy.', icon: '🫘', color: '#8D6E63', category: 'Protein' },
  { id: 'q15', text: 'Green tea has powerful antioxidants that improve brain function and support fat metabolism.', icon: '🍵', color: '#558B2F', category: 'Beverages' },
  { id: 'q16', text: 'Blueberries, amla and pomegranate fight free radicals and slow cellular ageing. Eat them daily.', icon: '🫐', color: '#5E35B1', category: 'Antioxidants' },
  { id: 'q17', text: 'Eating within an 8-hour window each day improves metabolism and reduces belly fat over time.', icon: '🕐', color: '#3949AB', category: 'Diet Tips' },
  { id: 'q18', text: 'Avocado and olive oil contain healthy fats that lower bad cholesterol and protect your heart.', icon: '🥑', color: '#43A047', category: 'Healthy Fats' },
  { id: 'q19', text: '7–8 hours of sleep is when your body repairs damaged cells. Sleep is medicine, not laziness.', icon: '😴', color: '#3949AB', category: 'Rest' },
  { id: 'q20', text: 'Carrots, sweet potato and mangoes are rich in Vitamin A — essential for your eyes and skin.', icon: '🥕', color: '#FB8C00', category: 'Vitamins' },
  { id: 'q21', text: 'Chew your food slowly. Digestion starts in the mouth, and eating fast leads to overeating.', icon: '🍽️', color: '#00897B', category: 'Digestion' },
  { id: 'q22', text: 'Cut down on ultra-processed foods. If there are more than 5 ingredients on the label, think twice.', icon: '🚫', color: '#E53935', category: 'Clean Eating' },
];
