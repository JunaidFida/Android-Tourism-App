"""
Debug script to check bookings and packages in the database
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "tourist_app")

async def debug_bookings():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    print("=" * 80)
    print("DEBUGGING BOOKINGS AND PACKAGES")
    print("=" * 80)
    
    # Get all bookings
    print("\n1. ALL BOOKINGS:")
    bookings = await db.bookings.find().to_list(None)
    for booking in bookings:
        print(f"\nBooking ID: {booking['_id']}")
        print(f"  Tour Package ID: {booking.get('tour_package_id')} (type: {type(booking.get('tour_package_id'))})")
        print(f"  Tourist ID: {booking.get('tourist_id')} (type: {type(booking.get('tourist_id'))})")
        print(f"  Status: {booking.get('status')}")
        print(f"  Booking Reference: {booking.get('booking_reference')}")
    
    # Get all packages
    print("\n2. ALL TOUR PACKAGES:")
    packages = await db.tour_packages.find().to_list(None)
    for package in packages:
        print(f"\nPackage ID: {package['_id']}")
        print(f"  Name: {package.get('name', package.get('title'))}")
        print(f"  Created By: {package.get('created_by')} (type: {type(package.get('created_by'))})")
        print(f"  Travel Company ID: {package.get('travel_company_id')} (type: {type(package.get('travel_company_id'))})")
    
    # Get all travel company users
    print("\n3. ALL TRAVEL COMPANY USERS:")
    companies = await db.users.find({"role": "travel_company"}).to_list(None)
    for company in companies:
        print(f"\nCompany ID: {company['_id']}")
        print(f"  Email: {company.get('email')}")
        print(f"  Full Name: {company.get('full_name')}")
        
        # Try to find packages for this company
        company_id_str = str(company['_id'])
        company_id_obj = company['_id']
        
        packages_by_str = await db.tour_packages.find({
            "$or": [
                {"created_by": company_id_str},
                {"travel_company_id": company_id_str}
            ]
        }).to_list(None)
        
        packages_by_obj = await db.tour_packages.find({
            "$or": [
                {"created_by": company_id_obj},
                {"travel_company_id": company_id_obj}
            ]
        }).to_list(None)
        
        print(f"  Packages found (string match): {len(packages_by_str)}")
        print(f"  Packages found (ObjectId match): {len(packages_by_obj)}")
        
        if packages_by_str or packages_by_obj:
            all_packages = packages_by_str + packages_by_obj
            package_ids = [p['_id'] for p in all_packages]
            
            # Find bookings for these packages
            bookings_for_company = await db.bookings.find({
                "tour_package_id": {"$in": package_ids}
            }).to_list(None)
            
            print(f"  Bookings for this company: {len(bookings_for_company)}")
            for booking in bookings_for_company:
                print(f"    - Booking {booking['_id']}: {booking.get('booking_reference')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(debug_bookings())
