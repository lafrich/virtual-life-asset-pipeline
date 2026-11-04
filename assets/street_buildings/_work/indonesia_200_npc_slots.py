"""Shared seat slots for the 200-asset Indonesian transport kit.

Metadata uses position normalized to each authored isometric footprint,
not a hard-coded pixel crop. Vehicle PNGs contain NO humans.
Semesta creates the human sprites from its Mahluk Hidup character templates.
All slot actions are loops, resolve to genuine published Mahluk frames when
present, and can be overridden by a user-authored animation later.
"""
from __future__ import annotations

DRIVER=dict(role="driver",template="human_male_base",action="ride_idle_driver")
PASSENGER=dict(role="passenger",template="human_female_base",action="ride_idle_passenger")

def make(s):
 if s.get("category")!="transport":return None
 n=s["id"]
 k=s["kind"]
 name=s["label"].lower()
 W=float(s["W"]);D=float(s["D"])
 def seat(role,at,feet,scale,action,template="human_male_base",layer="front",optional=False,enabledByDefault=False):
  return dict(role=role,profile=template,action=action,
   anchor=[round(W*at[0]-W*.5,3),round(feet,3),round(D*at[1]-D*.5,3)],
   scale=scale,layer=layer,optional=optional,enabledByDefault=enabledByDefault)
 slots=[]
 if k in ("becak","bentor"):
  slots=[seat("driver",(.71,.60),.48,.61,
              "pedal_becak" if k=="becak" else "ride_idle_driver",layer="rear"),
         seat("passenger_1",(.33,.31),.66,.55,
              "sit_idle_transport","human_female_base",layer="front",optional=True)]
 elif k=="andong":
  slots=[seat("driver",(.45,.53),.84,.64,"ride_idle_driver",layer="rear"),
         seat("passenger_1",(.24,.51),.84,.57,"sit_idle_transport",
              "human_female_base",layer="front",optional=True)]
 elif k in ("motor","sepeda"):
  bicycle=k=="sepeda"
  slots=[seat("driver",(.57,.53),.66 if not bicycle else .52,.61 if bicycle else .62,
              "pedal_bicycle" if bicycle else "ride_idle_driver",layer="front")]
  if "keluarga" in name:
   slots.append(seat("passenger_1",(.31,.53),.61,.55,"ride_idle_passenger",
                     "human_female_base",layer="rear"))
   # Use the genuine child template only if published. Never fake a child by
   # shrinking an adult male/female body.
   slots.append(seat("child",(.42,.55),.64,.41,"ride_idle_passenger",
                     "human_child_base",layer="front",optional=True,enabledByDefault=True))
  elif "penumpang" in name:
   slots.append(seat("passenger_1",(.30,.53),.61,.55,"ride_idle_passenger",
                     "human_female_base",layer="rear"))
  elif "roti" in name:
   slots[0]["action"]="pedal_bicycle"
  if "ojol" in name or "kurir" in name:
   slots[0]["equipment"]=["helmet"]
 else:
  return None
 assert slots and all(-W*.5<=p["anchor"][0]<=W*.5 and
                       -D*.5<=p["anchor"][2]<=D*.5 for p in slots)
 return dict(version=1,modular=True,riderSource="Mahluk Hidup",
             emptyVehicle=True,slots=slots)
