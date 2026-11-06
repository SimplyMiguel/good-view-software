export interface DemoImage {
  src: string;
  alt: string;
  caption: string;
  source: string;
}

const img = (name: string, alt: string, caption: string, source: string): DemoImage => ({
  src: `/demos/restaurant/${name}.jpg`,
  alt,
  caption,
  source,
});

export const images = {
  hero: img("hero", "Restaurant dining room at dusk", "Hero — the dining room at dusk: wide shot, warm candlelight, every table full.", "https://unsplash.com/photos/a-warm-inviting-restaurant-interior-is-shown-8R-gdWyX1rg"),
  room: img("room", "Daytime dining room with large windows", "Intro — daytime dining room with the street-facing windows.", "https://unsplash.com/photos/cozy-rustic-restaurant-interior-with-large-windows-Q73XXHcIsa8"),
  counter: img("counter", "Pintxos displayed on a bar counter", "The bar — pintxos counter at 6pm, full spread before service.", "https://unsplash.com/photos/delicious-spanish-pintxos-and-tapas-displayed-on-a-counter-I6VLaTNCs9I"),
  croquetas: img("croquetas", "Croquetas on a white plate", "Agenda — croquetas de jamón, close-up on a house plate.", "https://unsplash.com/photos/fried-food-on-white-ceramic-plate-8XDvZ_VTtjw"),
  chef: img("chef", "Chef plating food in a dim kitchen", "Agenda — chef plating in the open kitchen.", "https://unsplash.com/photos/chef-plating-food-in-a-dimly-lit-kitchen-bhoHDqroF14"),
  txakoli: img("txakoli", "Two glasses of txakoli on a tray", "Agenda — txakoli poured high at the bar.", "https://unsplash.com/photos/two-glasses-filled-with-drinks-sitting-on-top-of-a-red-tray-ZTirxgjBzlI"),
  table: img("table", "Long table set with plates and candles", "The restaurant — family-style table for twelve, set for Sunday supper.", "https://unsplash.com/photos/a-long-table-with-plates-and-candles-on-it-PyL-lApI1F8"),
  exterior: img("exterior", "Restaurant entrance lit up at night", "Visit — the front door downtown at night, sign lit.", "https://unsplash.com/photos/the-entrance-to-a-restaurant-lit-up-at-night-qpI_p_YMdl8"),
} satisfies Record<string, DemoImage>;
