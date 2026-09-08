import os, json, re, random
from flask import Flask, render_template, request, jsonify

# ── IBM watsonx.ai / Granite ───────────────────────────────────────────────
try:
    from ibm_watsonx_ai import Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference
    from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

    _APIKEY     = os.environ.get("WATSONX_APIKEY", "")
    _PROJECT_ID = os.environ.get("WATSONX_PROJECT_ID", "")
    _URL        = os.environ.get("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")

    if _APIKEY and _PROJECT_ID:
        _credentials = Credentials(url=_URL, api_key=_APIKEY)
        _model = ModelInference(
            model_id="ibm/granite-13b-instruct-v2",
            credentials=_credentials,
            project_id=_PROJECT_ID,
            params={
                GenParams.MAX_NEW_TOKENS: 1200,
                GenParams.TEMPERATURE: 0.7,
                GenParams.TOP_P: 0.9,
            },
        )
        GRANITE_AVAILABLE = True
    else:
        GRANITE_AVAILABLE = False
except Exception:
    GRANITE_AVAILABLE = False

app = Flask(__name__)

# ──────────────────────────────────────────────────────────────────────────
# Fallback data  (used when Granite is unavailable or credentials not set)
# ──────────────────────────────────────────────────────────────────────────
HOTELS = {
    "beach": [
        {"name": "Ocean Breeze Resort",  "rating": 4.7, "price_per_night": 180, "amenities": ["Pool", "Spa", "Beach Access", "Restaurant"], "highlight": "Beachfront infinity pool with coral-reef snorkelling steps away."},
        {"name": "Sunset Bay Hotel",     "rating": 4.3, "price_per_night": 120, "amenities": ["Pool", "Bar", "Sea View", "Wi-Fi"],            "highlight": "Panoramic sea-view rooms with private balcony at every tier."},
        {"name": "Coral Sands Inn",      "rating": 3.9, "price_per_night": 75,  "amenities": ["Beach Access", "Wi-Fi", "Breakfast"],          "highlight": "Budget-friendly hideaway 50 m from the shore."},
    ],
    "adventure": [
        {"name": "Mountain Peak Lodge",   "rating": 4.6, "price_per_night": 150, "amenities": ["Hiking Gear", "Guide Service", "Fireplace", "Meals"],  "highlight": "Certified mountain guides included; gear hire on-site."},
        {"name": "Trailblazers Camp",     "rating": 4.2, "price_per_night": 90,  "amenities": ["Camping Kits", "Wi-Fi", "Bonfire Area"],               "highlight": "Glamping tents with direct trail access at the doorstep."},
        {"name": "Wild Frontier Hostel",  "rating": 3.8, "price_per_night": 45,  "amenities": ["Dormitory", "Shared Kitchen", "Locker"],               "highlight": "Lively hostel hub — meet fellow adventurers every evening."},
    ],
    "cultural": [
        {"name": "Heritage Grand Hotel",  "rating": 4.8, "price_per_night": 200, "amenities": ["Museum Tours", "Spa", "Fine Dining", "Concierge"],     "highlight": "19th-century landmark building with guided heritage walks."},
        {"name": "Old Town Boutique",     "rating": 4.4, "price_per_night": 130, "amenities": ["Historic District", "Breakfast", "Wi-Fi"],             "highlight": "Each room uniquely decorated by a local artisan."},
        {"name": "City Centre Inn",       "rating": 4.0, "price_per_night": 80,  "amenities": ["Central Location", "Wi-Fi", "24h Reception"],          "highlight": "Walk to all major museums and monuments in under 10 min."},
    ],
    "luxury": [
        {"name": "The Royal Palace Hotel","rating": 5.0, "price_per_night": 550, "amenities": ["Butler Service", "Private Pool", "Michelin Dining", "Helipad"], "highlight": "Dedicated butler service and Michelin-starred in-house restaurant."},
        {"name": "Golden Horizon Resort", "rating": 4.9, "price_per_night": 380, "amenities": ["Spa", "Yacht Access", "Personal Chef", "Concierge"],           "highlight": "Private yacht charter included for guests staying 3+ nights."},
        {"name": "Prestige Suites",       "rating": 4.7, "price_per_night": 280, "amenities": ["Penthouse Views", "Jacuzzi", "Lounge", "Valet"],               "highlight": "Skyline penthouse suites with private rooftop jacuzzi."},
    ],
    "budget": [
        {"name": "Backpackers Nest",      "rating": 4.1, "price_per_night": 25, "amenities": ["Shared Dorm", "Wi-Fi", "Locker", "Common Kitchen"], "highlight": "Voted #1 budget stay by Lonely Planet three years running."},
        {"name": "Cozy Corner Hostel",    "rating": 3.9, "price_per_night": 35, "amenities": ["Private Room", "Wi-Fi", "Breakfast"],              "highlight": "Free breakfast and 24-hour coffee station included."},
        {"name": "Budget Stay Inn",       "rating": 3.7, "price_per_night": 50, "amenities": ["En-Suite", "Wi-Fi", "Parking"],                    "highlight": "Free secure parking — great for road-trip travellers."},
    ],
}

ACTIVITIES = {
    "beach":     ["Sunrise snorkelling session","Beach volleyball tournament","Boat tour to hidden coves","Surfing lesson with local instructor","Sunset cruise","Underwater sea-walk","Parasailing adventure","Local seafood cooking class","Beach bonfire night"],
    "adventure": ["White-water rafting","Mountain summit hike","Zip-line canopy tour","Rock-climbing with guide","Paragliding over the valley","Night safari","Bungee jumping","Caving exploration","Off-road ATV trail"],
    "cultural":  ["Old city walking tour","Visit ancient temple complex","Local market food tour","Traditional dance show","Museum of history & art","Pottery workshop","Street art neighbourhood walk","Cooking class (local cuisine)","Sunset at heritage fort"],
    "luxury":    ["Private yacht charter","Helicopter city tour","Exclusive spa day","Fine-dining with chef's table","Private wine & cheese tasting","Golf at championship course","Hot-air balloon ride","VIP shopping experience","Private island day trip"],
    "budget":    ["Free city walking tour","Street food crawl","Public beach day","Local market exploration","Free museum Tuesday","Scenic bike ride","Community cultural festival","Sunset viewpoint hike","Picnic in the park"],
}

PLACES = {
    "beach":     [{"name":"Crystal Cove Beach","desc":"Pristine white-sand beach with crystal-clear waters."},{"name":"Lighthouse Point","desc":"Iconic lighthouse with panoramic coastal views."},{"name":"Coral Reef Marine Park","desc":"UNESCO-listed marine biodiversity hotspot."},{"name":"Fishermen's Wharf","desc":"Bustling waterfront with fresh seafood stalls."},{"name":"Sea Glass Cove","desc":"Secluded cove famous for colourful sea glass."}],
    "adventure": [{"name":"Eagle Peak Summit","desc":"Challenging summit with 360° mountain panorama."},{"name":"Thunder Falls","desc":"Thundering 80 m waterfall deep in the forest."},{"name":"Dragon's Back Ridge","desc":"Dramatic ridge hike with spine-tingling drops."},{"name":"Emerald Forest Reserve","desc":"Ancient rainforest teeming with exotic wildlife."},{"name":"Canyon Overlook","desc":"Sheer canyon walls dropping 400 m."}],
    "cultural":  [{"name":"Old Bazaar Quarter","desc":"Labyrinthine market alive since the 12th century."},{"name":"Royal Citadel","desc":"Massive fortification with 3000 years of history."},{"name":"Temple of Light","desc":"Sacred site with dazzling gilded spires."},{"name":"National History Museum","desc":"World-class collection spanning five civilisations."},{"name":"Folk Arts Village","desc":"Living museum of traditional crafts and cuisine."}],
    "luxury":    [{"name":"Riviera Promenade","desc":"Glamorous clifftop walk lined with designer boutiques."},{"name":"Skyline Rooftop District","desc":"Upscale rooftop bars and fine dining with city views."},{"name":"Vineyards & Estates","desc":"Award-winning wineries offering private tastings."},{"name":"Uptown Arts District","desc":"Galleries, opera and elite cultural experiences."},{"name":"Exclusive Marina","desc":"Super-yacht marina with VIP clubs and waterfront dining."}],
    "budget":    [{"name":"Central Park & Gardens","desc":"Free green oasis perfect for picnics and people-watching."},{"name":"Street Food Alley","desc":"50+ stalls serving local dishes from under $2."},{"name":"Public Viewpoint Hill","desc":"Free panoramic city viewpoint accessible by local bus."},{"name":"Community Market","desc":"Lively weekend market with crafts and cheap eats."},{"name":"Waterfront Walk","desc":"Free scenic promenade along the harbour."}],
}

TIPS = {
    "beach":     ["Apply SPF 50+ sunscreen every 2 hours — tropical sun is deceptive.","Book water-sports 1 day in advance — slots fill quickly in peak season.","Check tide times before snorkelling or sea-walking.","Use reef-safe sunscreen to protect marine ecosystems.","Outdoor activities are best before 11 am and after 4 pm."],
    "adventure": ["Break in new hiking boots at home before the trip — blisters ruin treks.","Always carry a compact first-aid kit and emergency whistle.","Check weather forecasts every morning — conditions change rapidly.","Hire a certified local guide for off-trail hikes — they know hidden risks.","Altitude increases dehydration — drink 3+ litres of water daily."],
    "cultural":  ["Dress modestly near religious sites — carry a light scarf or shawl.","Learn 10 local phrases — locals appreciate the effort enormously.","Bargaining in markets is expected — start at 50% and meet in the middle.","Book popular museum time-slots online to skip long queues.","Carry small-denomination cash — many vendors don't accept cards."],
    "luxury":    ["Reserve exclusive restaurants at least 2 weeks ahead.","Use your hotel concierge for transfers — they pre-screen and vet drivers.","Tip generously (15–20%) — it unlocks genuinely elevated service.","Pack smart-casual attire: rooftop bars often enforce dress codes.","Insure high-value items separately — standard travel insurance rarely covers luxury goods."],
    "budget":    ["City transit cards save 40–60% vs single-journey tickets.","Eat at lunchtime sets in restaurants — same food as dinner, half the price.","Book accommodation 3–4 weeks ahead — last-minute budget rooms vanish fast.","Free walking tours run on tips — $5–10 is fair for a 2-hour tour.","Download offline maps before you land to avoid costly roaming data."],
}


# ──────────────────────────────────────────────────────────────────────────
# Granite helpers
# ──────────────────────────────────────────────────────────────────────────

def _ask_granite(prompt: str) -> str:
    """Send a prompt to IBM Granite and return the raw text response."""
    result = _model.generate_text(prompt=prompt)
    return result.strip() if isinstance(result, str) else str(result).strip()


def _parse_json_block(text: str):
    """Extract the first JSON object/array from a Granite response."""
    match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    return None


def granite_itinerary(destination: str, days: int, travel_type: str) -> list:
    prompt = (
        f"You are a professional travel planner. Create a detailed {days}-day itinerary for a "
        f"{travel_type} trip to {destination}.\n"
        f"Return ONLY a JSON array with {days} objects. Each object must have exactly these keys:\n"
        f'  "day" (integer), "theme" (short day title string), '
        f'"morning" (activity string), "afternoon" (activity string), "evening" (activity string).\n'
        f"No extra text, no markdown fences — only the JSON array."
    )
    try:
        raw = _ask_granite(prompt)
        parsed = _parse_json_block(raw)
        if isinstance(parsed, list) and parsed:
            return parsed
    except Exception:
        pass
    return _fallback_itinerary(destination, days, travel_type)


def granite_hotels(destination: str, budget: int, days: int, travel_type: str) -> list:
    prompt = (
        f"You are a hotel expert. Recommend 3 hotels for a {travel_type} trip to {destination}, "
        f"{days} days, total budget ${budget} USD.\n"
        f"Return ONLY a JSON array of 3 objects, each with keys:\n"
        f'  "name", "rating" (float 1-5), "price_per_night" (integer USD), '
        f'"amenities" (array of 4 strings), "highlight" (one compelling sentence).\n'
        f"No extra text, no markdown fences — only the JSON array."
    )
    try:
        raw = _ask_granite(prompt)
        parsed = _parse_json_block(raw)
        if isinstance(parsed, list) and parsed:
            return parsed
    except Exception:
        pass
    return _fallback_hotels(travel_type, budget, days)


def granite_budget(destination: str, budget: int, days: int, travel_type: str, hotel_price: int) -> dict:
    prompt = (
        f"You are a travel finance expert. Create a realistic budget breakdown for a {travel_type} trip to "
        f"{destination}, {days} days, total ${budget} USD, accommodation ${hotel_price}/night.\n"
        f"Return ONLY a JSON object with keys: "
        f'"total", "accommodation", "food", "activities", "transport", "shopping", "miscellaneous". '
        f"All values must be integers that sum to {budget}.\n"
        f"No extra text, no markdown fences — only the JSON object."
    )
    try:
        raw = _ask_granite(prompt)
        parsed = _parse_json_block(raw)
        if isinstance(parsed, dict) and "total" in parsed:
            return parsed
    except Exception:
        pass
    return _fallback_budget(budget, days, hotel_price)


def granite_tips(destination: str, travel_type: str) -> list:
    prompt = (
        f"You are an experienced traveller. Give 5 practical, specific travel tips for a {travel_type} trip to {destination}.\n"
        f'Return ONLY a JSON array of 5 strings. Each string is one tip (1–2 sentences).\n'
        f"No extra text, no markdown fences — only the JSON array."
    )
    try:
        raw = _ask_granite(prompt)
        parsed = _parse_json_block(raw)
        if isinstance(parsed, list) and parsed:
            return parsed
    except Exception:
        pass
    return TIPS.get(travel_type, TIPS["cultural"])


# ──────────────────────────────────────────────────────────────────────────
# Fallback generators (identical logic to original app)
# ──────────────────────────────────────────────────────────────────────────

def _fallback_hotels(travel_type: str, budget: int, days: int) -> list:
    bank = HOTELS.get(travel_type, HOTELS["budget"])
    affordable = [h for h in bank if h["price_per_night"] * days <= budget * 0.45]
    if not affordable:
        affordable = bank
    return sorted(affordable, key=lambda x: -x["rating"])[:3]


def _fallback_itinerary(destination: str, days: int, travel_type: str) -> list:
    acts = list(ACTIVITIES.get(travel_type, ACTIVITIES["cultural"]))
    random.shuffle(acts)
    result = []
    for day in range(1, days + 1):
        result.append({
            "day": day,
            "theme": f"Day {day} in {destination}",
            "morning": acts[(day * 2 - 2) % len(acts)],
            "afternoon": acts[(day * 2 - 1) % len(acts)],
            "evening": "Explore local restaurants & nightlife" if day % 2 == 0 else "Relax at accommodation & plan ahead",
        })
    return result


def _fallback_budget(budget: int, days: int, hotel_price: int) -> dict:
    accommodation = hotel_price * days
    remaining = budget - accommodation
    food        = round(remaining * 0.30)
    activities  = round(remaining * 0.25)
    transport   = round(remaining * 0.20)
    shopping    = round(remaining * 0.15)
    misc        = max(budget - accommodation - food - activities - transport - shopping, 0)
    return dict(total=budget, accommodation=accommodation, food=food,
                activities=activities, transport=transport, shopping=shopping, miscellaneous=misc)


# ──────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/plan", methods=["POST"])
def plan():
    data        = request.get_json()
    destination = data.get("destination", "Unknown").strip().title()
    budget      = int(data.get("budget", 1000))
    days        = int(data.get("days", 5))
    travel_type = data.get("travel_type", "cultural").lower()

    if GRANITE_AVAILABLE:
        hotels    = granite_hotels(destination, budget, days, travel_type)
        itinerary = granite_itinerary(destination, days, travel_type)
        tips      = granite_tips(destination, travel_type)
    else:
        hotels    = _fallback_hotels(travel_type, budget, days)
        itinerary = _fallback_itinerary(destination, days, travel_type)
        tips      = TIPS.get(travel_type, TIPS["cultural"])

    hotel_price = hotels[0].get("price_per_night", 80) if hotels else 80

    if GRANITE_AVAILABLE:
        budget_breakdown = granite_budget(destination, budget, days, travel_type, hotel_price)
    else:
        budget_breakdown = _fallback_budget(budget, days, hotel_price)

    places_raw = PLACES.get(travel_type, PLACES["cultural"])

    return jsonify({
        "destination": destination,
        "days":        days,
        "travel_type": travel_type.capitalize(),
        "ai_powered":  GRANITE_AVAILABLE,
        "hotels":      hotels,
        "itinerary":   itinerary,
        "budget":      budget_breakdown,
        "places":      places_raw,
        "tips":        tips,
    })


@app.route("/config-status")
def config_status():
    return jsonify({"granite_available": GRANITE_AVAILABLE})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
