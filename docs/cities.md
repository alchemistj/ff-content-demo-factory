# Target city list: Wichita-band metros

The factory's target list of US metropolitan statistical areas (MSAs) with a 2025 population of roughly **300,000 to 600,000**. Josh calls these "Wichitas"; Wichita, KS is the anchor.

**Source:** U.S. Census Bureau, Population Estimates Program, Vintage 2025 metro and micro statistical area estimates (estimate year 2025), column `POPESTIMATE2025` in `cbsa-est2025-alldata.csv`:
- https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/metro/totals/cbsa-est2025-alldata.csv
- Table page: https://www.census.gov/data/tables/time-series/demo/popest/2020s-total-metro-and-micro-statistical-areas.html

**Exclusions**
- **Florida, Colorado, Oregon, Washington:** every metro that touches these states is out (for example Port St. Lucie, Ocala, Boulder, Fort Collins, Greeley, Eugene-Springfield, Salem, Olympia, Kennewick-Richland).
- **Northern California:** Modesto, Salinas, Santa Rosa-Petaluma and Vallejo are out, since they sit north of Fresno and San Luis Obispo. Visalia and Santa Maria-Santa Barbara are kept as Southern and Central California.
- **Springfield, MO** (500,694) is out, as is any metro in the 417 area code. Joplin, MO-KS (208,796) falls in that area code but is below the band anyway.

**Exception:** Wichita, KS is included at 663,809, slightly above 600,000, because it is the anchor metro.

**Method notes:** Regions use Census regions, with the Census South split so that Texas and Oklahoma (with Arizona and New Mexico) form Southwest. Multistate metros take the region of their first-listed state. Principal city is the first city named in the Census metro name. The metro name uses a single hyphen where the Census name has a double one.

## Metros

| Metro | State | Region | Population (2025) |
| --- | --- | --- | ---: |
| Wichita, KS | KS | Midwest | 663,809 |
| Toledo, OH | OH | Midwest | 599,376 |
| Chattanooga, TN-GA | TN | South | 594,530 |
| New Haven, CT | CT | Northeast | 578,741 |
| Reno, NV | NV | West | 578,734 |
| Portland-South Portland, ME | ME | Northeast | 577,635 |
| Scranton-Wilkes-Barre, PA | PA | Northeast | 574,418 |
| Lancaster, PA | PA | Northeast | 563,159 |
| Huntsville, AL | AL | South | 556,444 |
| Lexington-Fayette, KY | KY | South | 535,174 |
| Killeen-Temple, TX | TX | Southwest | 511,497 |
| Wilmington, NC | NC | South | 492,772 |
| Visalia, CA | CA | West | 485,146 |
| Lansing-East Lansing, MI | MI | Midwest | 479,722 |
| York-Hanover, PA | PA | Northeast | 473,197 |
| Fort Wayne, IN | IN | Midwest | 466,258 |
| Springfield, MA | MA | Northeast | 464,338 |
| Waterbury-Shelton, CT | CT | Northeast | 463,349 |
| Corpus Christi, TX | TX | Southwest | 451,191 |
| Santa Maria-Santa Barbara, CA | CA | West | 442,065 |
| Reading, PA | PA | Northeast | 440,072 |
| Savannah, GA | GA | South | 438,314 |
| Brownsville-Harlingen, TX | TX | Southwest | 433,946 |
| Manchester-Nashua, NH | NH | Northeast | 433,415 |
| Gulfport-Biloxi, MS | MS | South | 431,329 |
| Myrtle Beach-Conway-North Myrtle Beach, SC | SC | South | 427,551 |
| Lafayette, LA | LA | South | 423,758 |
| Youngstown-Warren, OH | OH | Midwest | 423,678 |
| Asheville, NC | NC | South | 422,345 |
| Mobile, AL | AL | South | 411,658 |
| Spartanburg, SC | SC | South | 407,656 |
| Anchorage, AK | AK | West | 405,821 |
| Flint, MI | MI | Midwest | 401,093 |
| Canton-Massillon, OH | OH | Midwest | 400,246 |
| Beaumont-Port Arthur, TX | TX | Southwest | 399,310 |
| Trenton-Princeton, NJ | NJ | Northeast | 399,289 |
| Fayetteville, NC | NC | South | 395,412 |
| Montgomery, AL | AL | South | 388,747 |
| Shreveport-Bossier City, LA | LA | South | 383,474 |
| Davenport-Moline-Rock Island, IA-IL | IA | Midwest | 380,452 |
| Hickory-Lenoir-Morganton, NC | NC | South | 376,890 |
| Atlantic City-Hammonton, NJ | NJ | Northeast | 372,047 |
| Ann Arbor, MI | MI | Midwest | 370,214 |
| Lubbock, TX | TX | Southwest | 368,431 |
| Huntington-Ashland, WV-KY-OH | WV | South | 365,965 |
| Peoria, IL | IL | Midwest | 363,505 |
| Lincoln, NE | NE | Midwest | 352,081 |
| Clarksville, TN-KY | TN | South | 349,001 |
| Rockford, IL | IL | Midwest | 337,242 |
| Green Bay, WI | WI | Midwest | 336,756 |
| Columbus, GA-AL | GA | South | 324,830 |
| South Bend-Mishawaka, IN-MI | IN | Midwest | 324,538 |
| Roanoke, VA | VA | South | 316,547 |
| Hagerstown-Martinsburg, MD-WV | MD | South | 315,280 |
| Kingsport-Bristol, TN-VA | TN | South | 314,834 |
| Sioux Falls, SD-MN | SD | Midwest | 314,638 |
| Waco, TX | TX | Southwest | 308,807 |

**Total: 57 metros** (Northeast 11, Midwest 15, South 21, Southwest 6, West 4).
