// SVG shapes for each beer's glass, in a 100×200 box standing on y = 196.
// outline is the whole glass; bowl is the inside that holds beer, from top
// (the brim) to bottom. Beer rises linearly from bottom to top, so a glass's
// shape changes how it looks, not how it scores.

export const GLASS_SHAPES = {
  // Jupiler: a tall, straight pils glass.
  pils: {
    outline: "M30,10 L70,10 L64,188 Q64,194 58,194 L42,194 Q36,194 36,188 Z",
    bowl: "M32.5,12 L67.5,12 L62,184 L38,184 Z",
    top: 12,
    bottom: 184,
  },
  // Hoegaarden: a chunky hexagonal tumbler with a thick base.
  tumbler: {
    outline: "M20,72 L80,72 L74,194 L26,194 Z",
    bowl: "M23,74 L77,74 L72.5,180 L27.5,180 Z",
    facets: "M38,74 L41,192 M62,74 L59,192",
    top: 74,
    bottom: 180,
  },
  // Duvel: a stemmed tulip that narrows towards the rim.
  tulip: {
    outline: "M30,40 C26,55 14,80 18,105 C22,130 40,138 46,142 L46,180 C30,182 28,192 50,194 C72,192 70,182 54,180 L54,142 C60,138 78,130 82,105 C86,80 74,55 70,40 Z",
    bowl: "M32,42 C28,56 17,80 21,105 C25,128 40,135 50,136 C60,135 75,128 79,105 C83,80 72,56 68,42 Z",
    top: 42,
    bottom: 136,
  },
  // Kwak: a round bulb on a neck, held in a wooden stand. The neck is wider
  // than the real glass's so the beer stays visible on small screens.
  kwak: {
    outline: "M30,10 L70,10 C64,30 61,45 61,60 L61,118 C82,126 84,172 50,178 C16,172 18,126 39,118 L39,60 C39,45 36,30 30,10 Z",
    bowl: "M32.5,12 L67.5,12 C62,30 59,45 59,60 L59,120 C78,128 80,169 50,175 C20,169 22,128 41,120 L41,60 C41,45 38,30 32.5,12 Z",
    stand: "M12,140 L12,196 M88,140 L88,196 M8,196 L92,196 M12,146 L88,146",
    top: 12,
    bottom: 175,
  },
  // Chimay: a wide, shallow chalice on a thick stem.
  chalice: {
    outline: "M14,70 L86,70 C86,110 70,128 56,130 L56,178 C74,180 76,192 50,194 C24,192 26,180 44,178 L44,130 C30,128 14,110 14,70 Z",
    bowl: "M17,72 L83,72 C83,108 68,125 50,126 C32,125 17,108 17,72 Z",
    top: 72,
    bottom: 126,
  },
  // Stella Artois: a tall chalice on a slim stem.
  stella: {
    outline: "M26,40 L74,40 C74,85 66,115 53,120 L53,180 C70,182 72,192 50,194 C28,192 30,182 47,180 L47,120 C34,115 26,85 26,40 Z",
    bowl: "M29,42 L71,42 C71,84 64,112 50,116 C36,112 29,84 29,42 Z",
    top: 42,
    bottom: 116,
  },
  // Orval: a big round bowl on a short stem.
  orval: {
    outline: "M20,62 C14,90 16,130 46,142 L46,176 C30,178 28,192 50,194 C72,192 70,178 54,176 L54,142 C84,130 86,90 80,62 Z",
    bowl: "M23,64 C17,90 19,126 50,138 C81,126 83,90 77,64 Z",
    top: 64,
    bottom: 138,
  },
  // Delirium Tremens: a tall stemmed tulip with a flared rim.
  delirium: {
    outline: "M30,22 C32,40 18,60 20,92 C22,120 40,130 47,134 L47,182 C32,184 30,193 50,195 C70,193 68,184 53,182 L53,134 C60,130 78,120 80,92 C82,60 68,40 70,22 Z",
    bowl: "M32,24 C34,40 21,60 23,92 C25,118 40,127 50,128 C60,127 75,118 77,92 C79,60 66,40 68,24 Z",
    top: 24,
    bottom: 128,
  },
  // Leffe: a wide goblet, straight-sided above a round bowl.
  goblet: {
    outline: "M16,52 L84,52 L84,78 C84,112 70,128 55,131 L55,178 C72,180 74,192 50,194 C26,192 28,180 45,178 L45,131 C30,128 16,112 16,78 Z",
    bowl: "M19,54 L81,54 L81,78 C81,110 68,125 50,127 C32,125 19,110 19,78 Z",
    top: 54,
    bottom: 127,
  },
  // Westmalle: a broad chalice with tapering sides and a flat bottom.
  westmalle: {
    outline: "M20,60 L80,60 L74,118 C72,126 62,130 56,131 L56,178 C72,180 74,192 50,194 C26,192 28,180 44,178 L44,131 C38,130 28,126 26,118 Z",
    bowl: "M23,62 L77,62 L71.5,116 C69.5,123 60,127 50,127 C40,127 30.5,123 28.5,116 Z",
    top: 62,
    bottom: 127,
  },
  // Tripel Karmeliet: tall and slim, fuller low down, flaring at the rim.
  karmeliet: {
    outline: "M28,14 C32,40 26,60 28,90 C30,130 42,146 46,150 L46,182 C32,184 30,193 50,195 C70,193 68,184 54,182 L54,150 C58,146 70,130 72,90 C74,60 68,40 72,14 Z",
    bowl: "M30.5,16 C34,40 28.5,60 30.5,90 C32.5,126 42,141 50,144 C58,141 67.5,126 69.5,90 C71.5,60 66,40 69.5,16 Z",
    top: 16,
    bottom: 144,
  },
  // Lindemans Kriek: a narrow flute on a stem.
  flute: {
    outline: "M36,14 L64,14 C64,70 62,110 54,124 L53,180 C68,182 70,192 50,194 C30,192 32,182 47,180 L46,124 C38,110 36,70 36,14 Z",
    bowl: "M38.5,16 L61.5,16 C61.5,70 59.5,108 50,120 C40.5,108 38.5,70 38.5,16 Z",
    top: 16,
    bottom: 120,
  },
  // Rodenbach: a straight, slightly tapered glass on a short foot.
  rodenbach: {
    outline: "M24,30 L76,30 L71,170 L71,180 C71,186 75,188 75,194 L25,194 C25,188 29,186 29,180 L29,170 Z",
    bowl: "M26.5,32 L73.5,32 L68.6,168 L31.4,168 Z",
    top: 32,
    bottom: 168,
  },
  // De Koninck: Antwerp's bolleke, a small round bowl that narrows at the rim.
  bolleke: {
    outline: "M30,86 C18,100 16,140 46,152 L46,178 C32,180 30,192 50,194 C70,192 68,180 54,178 L54,152 C84,140 82,100 70,86 Z",
    bowl: "M32.5,88 C21,101 19.5,137 50,148 C80.5,137 79,101 67.5,88 Z",
    top: 88,
    bottom: 148,
  },
  // La Chouffe: a short-stemmed tulip, fatter than Duvel's.
  chouffe: {
    outline: "M28,50 C22,64 12,84 15,104 C18,126 38,138 46,141 L46,180 C30,182 28,192 50,194 C72,192 70,182 54,180 L54,141 C62,138 82,126 85,104 C88,84 78,64 72,50 Z",
    bowl: "M30.5,52 C25,65 15,84 18,104 C21,124 38,134 50,136 C62,134 79,124 82,104 C85,84 75,65 69.5,52 Z",
    top: 52,
    bottom: 136,
  },
  // Gulden Draak: a tall goblet with a flared rim on a long stem.
  draak: {
    outline: "M18,32 C25,42 27,52 27,64 C27,98 38,112 47,117 L47,182 C32,184 30,193 50,195 C70,193 68,184 53,182 L53,117 C62,112 73,98 73,64 C73,52 75,42 82,32 Z",
    bowl: "M21.5,34 C27.5,43 30,52 30,64 C30,96 40,109 50,113 C60,109 70,96 70,64 C70,52 72.5,43 78.5,34 Z",
    top: 34,
    bottom: 113,
  },
  // Rochefort: a deep chalice, straight-sided before it rounds off.
  rochefort: {
    outline: "M22,58 L78,58 L77,98 C76,120 64,130 55,132 L55,178 C72,180 74,192 50,194 C26,192 28,180 45,178 L45,132 C36,130 24,120 23,98 Z",
    bowl: "M25,60 L75,60 L74,98 C73,118 62,127 50,128 C38,127 27,118 26,98 Z",
    top: 60,
    bottom: 128,
  },
  // Palm: a big round globe, narrower at the rim, on a short stem.
  palm: {
    outline: "M30,50 C14,64 10,110 30,132 C36,138 42,140 46,141 L46,178 C30,180 28,192 50,194 C72,192 70,180 54,178 L54,141 C58,140 64,138 70,132 C90,110 86,64 70,50 Z",
    bowl: "M32.5,52 C17,66 13,108 32,129 C38,135 44,137 50,137 C56,137 62,135 68,129 C87,108 83,66 67.5,52 Z",
    top: 52,
    bottom: 137,
  },
  // Duchesse de Bourgogne: a wine glass on a thin stem.
  duchesse: {
    outline: "M28,40 C24,56 20,72 21,88 C22,108 36,120 48,122 L48,182 C32,184 30,193 50,195 C70,193 68,184 52,182 L52,122 C64,120 78,108 79,88 C80,72 76,56 72,40 Z",
    bowl: "M30.5,42 C27,57 23,72 24,88 C25,106 37,117 50,118 C63,117 75,106 76,88 C77,72 73,57 69.5,42 Z",
    top: 42,
    bottom: 118,
  },
  // Brugse Zot: a tall stemmed glass, wide at the rim and tapering down.
  zot: {
    outline: "M24,26 L76,26 L66,118 C64,126 58,130 54,131 L54,180 C70,182 72,192 50,194 C28,192 30,182 46,180 L46,131 C42,130 36,126 34,118 Z",
    bowl: "M26.5,28 L73.5,28 L63.6,116 C61.6,123 56,127 50,127 C44,127 38.4,123 36.4,116 Z",
    top: 28,
    bottom: 127,
  },
  // Piraat: a round belly, pinched waist and flared rim, like a thistle.
  piraat: {
    outline: "M22,44 C26,56 30,64 30,74 C22,82 16,96 18,110 C20,128 38,138 46,140 L46,178 C30,180 28,192 50,194 C72,192 70,180 54,178 L54,140 C62,138 80,128 82,110 C84,96 78,82 70,74 C70,64 74,56 78,44 Z",
    bowl: "M24.5,46 C28,57 32,65 32,75 C24.5,83 19,96 21,110 C23,126 39,134 50,135 C61,134 77,126 79,110 C81,96 75.5,83 68,75 C68,65 72,57 75.5,46 Z",
    top: 46,
    bottom: 135,
  },
};
