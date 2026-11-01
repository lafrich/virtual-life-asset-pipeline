| sprite (x4 dirs: se, nw, sw, ne) | size px (w×h) | pivot = footprint-centre ground px | game anchor P(0,lane) px (se / nw) | footprint tiles (L × w) | game equivalent |
|---|---|---|---|---|---|
| `cars/sedan_red_<dir>.png` | 146×138 | 73,100 | [45, 68] / [45, 68] | 2.9 × 1.05 | vehicle('sedan',lane,dirn,['#FF5A5F','#E0434A','#B8323A']) |
| `cars/sedan_teal_<dir>.png` | 146×138 | 73,100 | [45, 68] / [45, 68] | 2.9 × 1.05 | vehicle('sedan',lane,dirn,['#2EC4B6','#22A094','#1B7F76']) |
| `cars/hatchback_orange_<dir>.png` | 136×132 | 68,96 | [45, 66] / [45, 66] | 2.6 × 1.05 | new kind (no game equivalent) |
| `cars/mpv_silver_<dir>.png` | 152×144 | 76,104 | [45, 70] / [45, 70] | 3.1 × 1.08 | new kind (no game equivalent) |
| `cars/taxi_bluebird_<dir>.png` | 152×148 | 76,108 | [45, 74] / [45, 74] | 3.1 × 1.05 | vehicle('taxi',lane,dirn,['#45B3E6','#2F97CF','#2479AD']) (data-ng brand colours) |
| `cars/van_cream_<dir>.png` | 162×162 | 81,120 | [46, 83] / [46, 83] | 3.4 × 1.1 | vehicle('van',...) (in code, not in the current traffic list) |
| `cars/bus_transjakarta_<dir>.png` | 272×256 | 136,186 | [48, 124] / [48, 124] | 6.6 × 1.3 | vehicle('bus',lane,dirn,['#2C6BD8','#F4F1EA','#2457B8']) (data-ng brand colours) |
| `riders/gojek_<dir>.png` | 80×116 | 40,94 | [35, 76] / [35, 76] | 1.3 × 0.7 | replaces vehicle('moto',...) (in code, not in the current traffic list) |
| `riders/gojek_pax_<dir>.png` | 80×116 | 40,94 | [35, 76] / [35, 76] | 1.3 × 0.7 | new (moto + passenger) |
| `riders/maxim_<dir>.png` | 80×116 | 40,94 | [35, 76] / [35, 76] | 1.3 × 0.7 | new (moto variant) |
| `riders/maxim_pax_<dir>.png` | 80×116 | 40,94 | [35, 76] / [35, 76] | 1.3 × 0.7 | new (moto + passenger) |
| `riders/sma_triple_<dir>.png` | 88×120 | 44,96 | [35, 76] / [35, 76] | 1.55 × 0.7 | new (moto variant, 3 riders) |
