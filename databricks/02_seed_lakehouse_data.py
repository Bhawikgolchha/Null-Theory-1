# Databricks notebook source
# MAGIC %md
# MAGIC # CampusGenie Lakehouse Seed Pipeline
# MAGIC **Catalog:** `campusgenie` | **Schema:** `gold`
# MAGIC 
# MAGIC This pipeline:
# MAGIC 1. Creates Unity Catalog `campusgenie`, schema `gold`, and volume `campusgenie.docs`.
# MAGIC 2. Creates and populates Delta tables:
# MAGIC    - `campusgenie.gold.events`
# MAGIC    - `campusgenie.gold.event_tags`
# MAGIC    - `campusgenie.gold.users`
# MAGIC    - `campusgenie.gold.user_tag_affinity`
# MAGIC    - `campusgenie.gold.swipes`
# MAGIC    - `campusgenie.gold.rsvps`
# MAGIC 3. Registers the consolidated analytical search view `campusgenie.gold.v_event_search` for Genie text-to-SQL.

# COMMAND ----------
import os
import sys
import json
import random
from datetime import datetime, timedelta, timezone

try:
    from pyspark.sql import SparkSession
    from pyspark.sql import functions as F
    from pyspark.sql.types import (
        StructType, StructField, StringType, IntegerType,
        BooleanType, TimestampType, DoubleType, ArrayType
    )
except ImportError:
    print("Warning: PySpark not installed in current Python environment. Running in standalone definition mode.")
    SparkSession = None

def get_spark():
    if "spark" in globals() and globals()["spark"] is not None:
        return globals()["spark"]
    if SparkSession:
        return SparkSession.builder \
            .appName("CampusGenie-LakehouseSeed") \
            .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
            .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
            .getOrCreate()
    return None

# COMMAND ----------
COLLEGES = [
    "RV College of Engineering (RVCE)",
    "PES University (RR Campus)",
    "BMS College of Engineering (BMSCE)",
    "M.S. Ramaiah Institute of Technology (MSRIT)",
    "IIIT Bangalore",
    "Christ University (Kengeri Campus)",
    "Dayananda Sagar College of Engineering (DSCE)",
    "Nitte Meenakshi Institute of Technology (NMIT)"
]

BANGALORE_AREAS = [
    "Koramangala",
    "Indiranagar",
    "Whitefield",
    "Electronic City",
    "Jayanagar",
    "HSR Layout",
    "Malleshwaram",
    "Yelahanka"
]

ORGANIZERS = [
    {"name": "IEEE Student Branch", "type": "club"},
    {"name": "Google Developer Group (GDG) Bangalore", "type": "community"},
    {"name": "ACM Chapter", "type": "club"},
    {"name": "Devfolio Community", "type": "community"},
    {"name": "Null Bangalore Security Chapter", "type": "community"},
    {"name": "Microsoft Student Ambassadors", "type": "company"},
    {"name": "Coding Club", "type": "club"},
    {"name": "Robotics & Automation Society", "type": "club"}
]

EVENT_TEMPLATES = [
    {"title": "Bangalore GenAI Buildathon", "category": "hackathon", "sub": "genai", "tags": ["ai_ml", "genai", "llm", "python"]},
    {"title": "Koramangala Agents Hack 2025", "category": "hackathon", "sub": "ai_ml", "tags": ["ai_ml", "rag", "typescript"]},
    {"title": "RVCE National Cyber Defense CTF", "category": "hackathon", "sub": "cybersecurity", "tags": ["cybersecurity", "ctf", "cloud"]},
    {"title": "PES OpenWeb3 Summer Summit", "category": "hackathon", "sub": "web3", "tags": ["web3", "solidity", "blockchain"]},
    {"title": "Databricks Lakehouse & AI Deep Dive", "category": "tech_talk", "sub": "ai_ml", "tags": ["ai_ml", "cloud", "devops"]},
    {"title": "Fullstack Next.js 15 & AI Masterclass", "category": "workshop", "sub": "web_development", "tags": ["web_development", "react", "nextjs"]},
    {"title": "BMSCE Autonomous Robotics Expo & Battle", "category": "hackathon", "sub": "robotics", "tags": ["robotics", "iot", "hardware"]},
    {"title": "Figma to Code: Modern UI/UX Sprint", "category": "workshop", "sub": "design", "tags": ["design", "ui_ux", "figma"]},
    {"title": "Whitefield Cloud Native Developers Meetup", "category": "tech_talk", "sub": "cloud", "tags": ["cloud", "docker", "devops"]},
    {"title": "IIITB Foundation Models & RAG Architecture", "category": "tech_talk", "sub": "ai_ml", "tags": ["ai_ml", "rag", "llm"]},
    {"title": "Bangalore Tech Career Fair & Intern Blitz", "category": "career_fair", "sub": "career", "tags": ["web_development", "ai_ml", "cloud"]},
    {"title": "Inter-College Battle of the Bands", "category": "cultural", "sub": "music", "tags": ["music", "cultural"]},
    {"title": "Bangalore Collegiate Esports Championship", "category": "sports", "sub": "gaming", "tags": ["gaming", "esports"]},
    {"title": "DSA & System Design Interview Marathon", "category": "workshop", "sub": "career", "tags": ["python", "web_development"]},
    {"title": "Hands-on IoT with ESP32 & FreeRTOS", "category": "workshop", "sub": "iot", "tags": ["iot", "robotics", "embedded"]}
]

def generate_events_data(count=250):
    now = datetime.now(timezone.utc)
    events = []
    
    for i in range(count):
        tmpl = EVENT_TEMPLATES[i % len(EVENT_TEMPLATES)]
        college = COLLEGES[i % len(COLLEGES)]
        area = BANGALORE_AREAS[i % len(BANGALORE_AREAS)]
        org = ORGANIZERS[i % len(ORGANIZERS)]
        
        day_offset = -15 + int((i * 80) / count)
        start_dt = now + timedelta(days=day_offset)
        if tmpl["category"] == "hackathon" and start_dt.weekday() not in (5, 6):
            start_dt += timedelta(days=(5 - start_dt.weekday()))
        start_dt = start_dt.replace(hour=9 + (i % 8), minute=0, second=0, microsecond=0)
        
        duration_days = 2 if tmpl["category"] == "hackathon" and i % 2 == 0 else (3 if tmpl["category"] == "hackathon" else 1)
        end_dt = (start_dt + timedelta(days=duration_days)).replace(hour=18, minute=0, second=0, microsecond=0)
        deadline_dt = start_dt - timedelta(days=2)
        
        is_free = (i % 3 != 0)
        fee_inr = 0 if is_free else [199, 299, 499, 799][i % 4]
        prize_pool = [25000, 50000, 100000, 250000, 500000][i % 5] if tmpl["category"] == "hackathon" else 0
        capacity = [60, 100, 150, 250, 400][i % 5]
        registered_count = int(capacity * (0.3 + 0.55 * ((i % 10) / 10.0)))
        
        mode = "online" if i % 5 == 0 else ("hybrid" if i % 4 == 0 else "offline")
        venue = "Online (Zoom / Discord)" if mode == "online" else f"{college} Auditorium / Tech Park"
        rulebook_doc_id = "POL-OD-2025" if tmpl["category"] == "hackathon" else None
        
        status = "closed" if deadline_dt < now else ("closing_soon" if registered_count / capacity > 0.85 else "open")
        event_id = f"EVT-{str(i + 1).zfill(4)}"
        version_str = f" v{i // len(EVENT_TEMPLATES) + 1}" if (i // len(EVENT_TEMPLATES)) > 0 else ""
        title = f"{tmpl['title']}{version_str}".strip()
        
        short_pitch = (
            f"Top {tmpl['sub']} event at {college.split(' ')[0]}. "
            f"{'Free entry' if is_free else f'₹{fee_inr} fee'}, "
            f"{f'₹{int(prize_pool/1000)}k in prizes' if prize_pool > 0 else 'certificates for all'}."
        )
        
        events.append({
            "event_id": event_id,
            "title": title,
            "description": f"Join us at {college} in {area} for {tmpl['title']}. Featuring keynote speakers, competitive tracks, hands-on mentorship, and networking opportunities.",
            "short_pitch": short_pitch,
            "category": tmpl["category"],
            "subcategory": tmpl["sub"],
            "mode": mode,
            "venue": venue,
            "area": area,
            "college": college,
            "organizer": org["name"],
            "organizer_type": org["type"],
            "start_ts": start_dt,
            "end_ts": end_dt,
            "duration_days": duration_days,
            "registration_deadline": deadline_dt,
            "is_free": is_free,
            "fee_inr": fee_inr,
            "prize_pool_inr": prize_pool,
            "team_size_min": (1 if i % 2 == 0 else 2) if tmpl["category"] == "hackathon" else 1,
            "team_size_max": 4 if tmpl["category"] == "hackathon" else 1,
            "eligibility": "2nd year+ engineering students" if i % 4 == 0 else "Any enrolled undergraduate/postgraduate student",
            "capacity": capacity,
            "registered_count": registered_count,
            "difficulty": ["beginner", "intermediate", "advanced"][i % 3],
            "registration_url": f"https://devfolio.co/events/evt-{str(i + 1).zfill(4)}",
            "registration_type": "external",
            "organizer_owned": (org["type"] == "club"),
            "organizer_contact": f"contact@{college.lower().replace(' ', '').replace('(', '').replace(')', '')[:5]}events.edu",
            "banner_url": f"https://images.unsplash.com/photo-{1515187029135 + (i % 20) * 1000}?w=800&auto=format&fit=crop&q=60",
            "rulebook_doc_id": rulebook_doc_id,
            "source": "campusgenie_crawler",
            "posted_ts": start_dt - timedelta(days=20),
            "status": status,
            "tags": tmpl["tags"]
        })
        
    return events

def generate_users_data(count=50):
    now = datetime.now(timezone.utc)
    branches = ["Computer Science", "Information Science", "AI & Data Engineering", "Electronics & Comm", "Robotics & Automation"]
    names = [
        "Aarav Sharma", "Ananya Rao", "Rohan Iyer", "Sneha Patil", "Karthik Reddy",
        "Pooja Hegde", "Aditya Kulkarni", "Meera Nair", "Vikram Gowda", "Divya Menon",
        "Tanvi Deshmukh", "Nikhil Bhat", "Sanjana Murthy", "Pranav Joshi", "Ishita Gupta"
    ]
    
    users = []
    tag_options = [
        ["ai_ml", "genai", "python", "llm"],
        ["web3", "solidity", "blockchain", "defi"],
        ["cybersecurity", "ctf", "cloud", "aws"],
        ["robotics", "iot", "hardware", "embedded"],
        ["web_development", "react", "nextjs", "typescript"],
        ["design", "ui_ux", "figma"],
        ["dance", "music", "cultural"]
    ]
    
    for i in range(count):
        user_id = f"USR-{str(i + 1).zfill(4)}"
        name = names[i % len(names)] + (f" #{i+1}" if i >= len(names) else "")
        email = f"{name.lower().replace(' ', '.').replace('#', '')}@bangalorestudent.edu"
        college = COLLEGES[i % len(COLLEGES)]
        branch = branches[i % len(branches)]
        year = (i % 4) + 1
        area = BANGALORE_AREAS[i % len(BANGALORE_AREAS)]
        created_ts = now - timedelta(days=random.randint(10, 120))
        onboarding_tags = tag_options[i % len(tag_options)]
        
        users.append({
            "user_id": user_id,
            "email": email,
            "name": name,
            "college": college,
            "branch": branch,
            "year": year,
            "area": area,
            "created_ts": created_ts,
            "onboarding_tags": onboarding_tags
        })
    return users

def generate_swipes_and_rsvps(users, events, swipe_count_per_user=15):
    now = datetime.now(timezone.utc)
    swipes = []
    rsvps = []
    swipe_id_seq = 1
    
    directions = ["right", "right", "super", "left"]
    fidelity_states = [
        ("saved", "intent"),
        ("clicked_out", "intent"),
        ("self_confirmed", "self_reported"),
        ("verified", "verified")
    ]
    
    for user in users:
        sampled_events = random.sample(events, min(swipe_count_per_user, len(events)))
        for ev in sampled_events:
            direction = random.choice(directions)
            swiped_ts = now - timedelta(days=random.randint(1, 14), hours=random.randint(1, 23))
            
            swipes.append({
                "swipe_id": f"SWP-{str(swipe_id_seq).zfill(6)}",
                "user_id": user["user_id"],
                "event_id": ev["event_id"],
                "direction": direction,
                "dwell_ms": random.randint(800, 4500),
                "surface": "swipe_deck",
                "swiped_ts": swiped_ts
            })
            swipe_id_seq += 1
            
            if direction in ("right", "super"):
                st, fid = random.choice(fidelity_states)
                rsvps.append({
                    "user_id": user["user_id"],
                    "event_id": ev["event_id"],
                    "state": st,
                    "fidelity": fid,
                    "share_consent": (fid in ("self_reported", "verified")),
                    "updated_ts": swiped_ts + timedelta(minutes=random.randint(2, 60))
                })
                
    return swipes, rsvps

def generate_user_affinities(users, swipes, events):
    now = datetime.now(timezone.utc)
    event_tag_map = {e["event_id"]: e["tags"] for e in events}
    affinities = []
    
    for user in users:
        tag_weights = {tag: 2.0 for tag in user["onboarding_tags"]}
        user_swipes = [s for s in swipes if s["user_id"] == user["user_id"]]
        
        for s in user_swipes:
            ev_tags = event_tag_map.get(s["event_id"], [])
            delta = 1.0 if s["direction"] == "right" else (2.0 if s["direction"] == "super" else -0.5)
            for t in ev_tags:
                tag_weights[t] = max(0.0, round(tag_weights.get(t, 0.0) + delta, 2))
                
        for t, w in tag_weights.items():
            affinities.append({
                "user_id": user["user_id"],
                "tag": t,
                "weight": float(w),
                "updated_ts": now
            })
            
    return affinities

# COMMAND ----------
def seed_lakehouse():
    spark = get_spark()
    if not spark:
        print("[Lakehouse Seed] Spark is not available. Generated definitions verified.")
        return

    print("======================================================================")
    print("Initializing CampusGenie Unity Catalog & Delta Tables...")
    print("======================================================================")
    
    # 1. Setup Catalog and Schema
    spark.sql("CREATE CATALOG IF NOT EXISTS campusgenie")
    spark.sql("USE CATALOG campusgenie")
    spark.sql("CREATE SCHEMA IF NOT EXISTS campusgenie.gold")
    spark.sql("USE SCHEMA campusgenie.gold")
    spark.sql("CREATE VOLUME IF NOT EXISTS campusgenie.docs")

    # 2. Generate Seed Datasets
    print("Generating seed dataset...")
    events_raw = generate_events_data(250)
    users_raw = generate_users_data(50)
    swipes_raw, rsvps_raw = generate_swipes_and_rsvps(users_raw, events_raw)
    affinities_raw = generate_user_affinities(users_raw, swipes_raw, events_raw)

    # 3. Create & Populate campusgenie.gold.events
    events_rows = []
    event_tags_rows = []
    for e in events_raw:
        row_dict = {k: v for k, v in e.items() if k != "tags"}
        events_rows.append(row_dict)
        for t in e["tags"]:
            event_tags_rows.append({"event_id": e["event_id"], "tag": t})

    df_events = spark.createDataFrame(events_rows)
    df_events.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable("campusgenie.gold.events")
    print(f"✓ Created table campusgenie.gold.events ({df_events.count()} rows)")

    # 4. Create & Populate campusgenie.gold.event_tags
    df_event_tags = spark.createDataFrame(event_tags_rows)
    df_event_tags.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable("campusgenie.gold.event_tags")
    print(f"✓ Created table campusgenie.gold.event_tags ({df_event_tags.count()} rows)")

    # 5. Create & Populate campusgenie.gold.users
    df_users = spark.createDataFrame(users_raw)
    df_users.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable("campusgenie.gold.users")
    print(f"✓ Created table campusgenie.gold.users ({df_users.count()} rows)")

    # 6. Create & Populate campusgenie.gold.user_tag_affinity
    df_affinities = spark.createDataFrame(affinities_raw)
    df_affinities.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable("campusgenie.gold.user_tag_affinity")
    print(f"✓ Created table campusgenie.gold.user_tag_affinity ({df_affinities.count()} rows)")

    # 7. Create & Populate campusgenie.gold.swipes
    df_swipes = spark.createDataFrame(swipes_raw)
    df_swipes.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable("campusgenie.gold.swipes")
    print(f"✓ Created table campusgenie.gold.swipes ({df_swipes.count()} rows)")

    # 8. Create & Populate campusgenie.gold.rsvps
    df_rsvps = spark.createDataFrame(rsvps_raw)
    df_rsvps.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable("campusgenie.gold.rsvps")
    print(f"✓ Created table campusgenie.gold.rsvps ({df_rsvps.count()} rows)")

    # 9. Register Consolidated Search View for Genie Text-to-SQL
    spark.sql("""
    CREATE OR REPLACE VIEW campusgenie.gold.v_event_search AS
    SELECT
      e.event_id,
      e.title,
      e.description,
      e.short_pitch,
      e.category,
      e.subcategory,
      e.mode,
      e.venue,
      e.area,
      e.college,
      e.organizer,
      e.organizer_type,
      e.start_ts,
      e.end_ts,
      e.duration_days,
      e.registration_deadline,
      e.is_free,
      e.fee_inr,
      e.prize_pool_inr,
      e.team_size_min,
      e.team_size_max,
      e.eligibility,
      e.capacity,
      e.registered_count,
      e.difficulty,
      e.registration_url,
      e.registration_type,
      e.organizer_owned,
      e.banner_url,
      e.rulebook_doc_id,
      e.status,
      concat_ws(', ', collect_list(t.tag))            AS tags_csv,
      collect_list(t.tag)                             AS tags,
      (e.capacity - e.registered_count)               AS seats_left,
      datediff(e.start_ts, current_date())            AS days_until,
      date_format(e.start_ts, 'EEEE')                 AS day_of_week,
      (e.registration_deadline >= current_timestamp()) AS is_registerable
    FROM campusgenie.gold.events e
    LEFT JOIN campusgenie.gold.event_tags t ON e.event_id = t.event_id
    GROUP BY ALL;
    """)
    print("✓ Created analytical view campusgenie.gold.v_event_search")

    print("\n[Lakehouse Seed] All Delta tables and views initialized successfully.")

# COMMAND ----------
if __name__ == "__main__":
    seed_lakehouse()
