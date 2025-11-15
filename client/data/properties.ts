export type RentTable = {
  base: number
  house1: number
  house2: number
  house3: number
  house4: number
  hotel: number
}

export type MonopolyTile = {
  id: number
  name: string
  type: 'property' | 'railroad' | 'utility' | 'tax' | 'chance' | 'chest' | 'corner'
  price?: number
  rents?: RentTable
  note?: string
}

export const tiles: MonopolyTile[] = [
  { id: 0, name: 'GO', type: 'corner' },
  { id: 1, name: 'Mediterranean Avenue', type: 'property', price: 60, rents: { base: 2, house1: 10, house2: 30, house3: 90, house4: 160, hotel: 250 } },
  { id: 2, name: 'Community Chest', type: 'chest' },
  { id: 3, name: 'Baltic Avenue', type: 'property', price: 60, rents: { base: 4, house1: 20, house2: 60, house3: 180, house4: 320, hotel: 450 } },
  { id: 4, name: 'Income Tax', type: 'tax' },
  { id: 5, name: 'Reading Railroad', type: 'railroad', price: 200, note: 'Rent: 25/50/100/200 depending on railroads owned' },
  { id: 6, name: 'Oriental Avenue', type: 'property', price: 100, rents: { base: 6, house1: 30, house2: 90, house3: 270, house4: 400, hotel: 550 } },
  { id: 7, name: 'Chance', type: 'chance' },
  { id: 8, name: 'Vermont Avenue', type: 'property', price: 100, rents: { base: 6, house1: 30, house2: 90, house3: 270, house4: 400, hotel: 550 } },
  { id: 9, name: 'Connecticut Avenue', type: 'property', price: 120, rents: { base: 8, house1: 40, house2: 100, house3: 300, house4: 450, hotel: 600 } },
  { id: 10, name: 'Just Visiting', type: 'corner' },
  { id: 11, name: 'St. Charles Place', type: 'property', price: 140, rents: { base: 10, house1: 50, house2: 150, house3: 450, house4: 625, hotel: 750 } },
  { id: 12, name: 'Electric Company', type: 'utility', price: 150, note: 'Rent: 4× dice if one utility, 10× if both' },
  { id: 13, name: 'States Avenue', type: 'property', price: 140, rents: { base: 10, house1: 50, house2: 150, house3: 450, house4: 625, hotel: 750 } },
  { id: 14, name: 'Virginia Avenue', type: 'property', price: 160, rents: { base: 12, house1: 60, house2: 180, house3: 500, house4: 700, hotel: 900 } },
  { id: 15, name: 'Pennsylvania Railroad', type: 'railroad', price: 200, note: 'Rent: 25/50/100/200 depending on railroads owned' },
  { id: 16, name: 'St. James Place', type: 'property', price: 180, rents: { base: 14, house1: 70, house2: 200, house3: 550, house4: 750, hotel: 950 } },
  { id: 17, name: 'Community Chest', type: 'chest' },
  { id: 18, name: 'Tennessee Avenue', type: 'property', price: 180, rents: { base: 14, house1: 70, house2: 200, house3: 550, house4: 750, hotel: 950 } },
  { id: 19, name: 'New York Avenue', type: 'property', price: 200, rents: { base: 16, house1: 80, house2: 220, house3: 600, house4: 800, hotel: 1000 } },
  { id: 20, name: 'Free Parking', type: 'corner' },
  { id: 21, name: 'Kentucky Avenue', type: 'property', price: 220, rents: { base: 18, house1: 90, house2: 250, house3: 700, house4: 875, hotel: 1050 } },
  { id: 22, name: 'Chance', type: 'chance' },
  { id: 23, name: 'Indiana Avenue', type: 'property', price: 220, rents: { base: 18, house1: 90, house2: 250, house3: 700, house4: 875, hotel: 1050 } },
  { id: 24, name: 'Illinois Avenue', type: 'property', price: 240, rents: { base: 20, house1: 100, house2: 300, house3: 750, house4: 925, hotel: 1100 } },
  { id: 25, name: 'B&O Railroad', type: 'railroad', price: 200, note: 'Rent: 25/50/100/200 depending on railroads owned' },
  { id: 26, name: 'Atlantic Avenue', type: 'property', price: 260, rents: { base: 22, house1: 110, house2: 330, house3: 800, house4: 975, hotel: 1150 } },
  { id: 27, name: 'Ventnor Avenue', type: 'property', price: 260, rents: { base: 22, house1: 110, house2: 330, house3: 800, house4: 975, hotel: 1150 } },
  { id: 28, name: 'Water Works', type: 'utility', price: 150, note: 'Rent: 4× dice if one utility, 10× if both' },
  { id: 29, name: 'Marvin Gardens', type: 'property', price: 280, rents: { base: 24, house1: 120, house2: 360, house3: 850, house4: 1025, hotel: 1200 } },
  { id: 30, name: 'Go To Jail', type: 'corner' },
  { id: 31, name: 'Pacific Avenue', type: 'property', price: 300, rents: { base: 26, house1: 130, house2: 390, house3: 900, house4: 1100, hotel: 1275 } },
  { id: 32, name: 'North Carolina Avenue', type: 'property', price: 300, rents: { base: 26, house1: 130, house2: 390, house3: 900, house4: 1100, hotel: 1275 } },
  { id: 33, name: 'Community Chest', type: 'chest' },
  { id: 34, name: 'Pennsylvania Avenue', type: 'property', price: 320, rents: { base: 28, house1: 150, house2: 450, house3: 1000, house4: 1200, hotel: 1400 } },
  { id: 35, name: 'Short Line Railroad', type: 'railroad', price: 200, note: 'Rent: 25/50/100/200 depending on railroads owned' },
  { id: 36, name: 'Chance', type: 'chance' },
  { id: 37, name: 'Park Place', type: 'property', price: 350, rents: { base: 35, house1: 175, house2: 500, house3: 1100, house4: 1300, hotel: 1500 } },
  { id: 38, name: 'Luxury Tax', type: 'tax' },
  { id: 39, name: 'Boardwalk', type: 'property', price: 400, rents: { base: 50, house1: 200, house2: 600, house3: 1400, house4: 1700, hotel: 2000 } },
]
