from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse
from app.utils.security import get_current_user
from app.models.user import UserInDB, UserRole
from app.utils.image_manager import image_manager
from typing import List
import os
import shutil
from pathlib import Path
import uuid

router = APIRouter(prefix="/images", tags=["images"])

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user)
):
    """Upload a profile or general image"""
    try:
        # Validate file type - be more lenient with content_type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
        content_type = file.content_type
        
        # If content_type is not set, try to infer from filename
        if not content_type or content_type not in allowed_types:
            if file.filename:
                file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
                ext_to_type = {
                    "jpg": "image/jpeg",
                    "jpeg": "image/jpeg",
                    "png": "image/png",
                    "gif": "image/gif",
                    "webp": "image/webp"
                }
                if file_ext in ext_to_type:
                    content_type = ext_to_type[file_ext]
        
        # Final validation
        if content_type and content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type: {content_type}. Only images are allowed."
            )
        
        # Create uploads directory if it doesn't exist (use spots directory for tourist spot images)
        upload_dir = Path("static/uploads/spots")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_extension = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
        unique_filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{file_extension}"
        file_path = upload_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return the URL path
        image_url = f"/static/uploads/spots/{unique_filename}"
        
        return {
            "success": True,
            "message": "Image uploaded successfully",
            "url": image_url,
            "image_url": image_url,
            "filename": unique_filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error uploading image: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading image: {str(e)}"
        )

@router.post("/process-all-spots")
async def process_all_spot_images(
    background_tasks: BackgroundTasks,
    current_user: UserInDB = Depends(get_current_user)
):
    """Process and download images for all tourist spots (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can process spot images"
        )
    
    # Run image processing in background
    background_tasks.add_task(image_manager.process_all_spots)
    
    return {
        "message": "Image processing started in background",
        "status": "processing"
    }

@router.post("/spots/{spot_id}/download")
async def download_spot_images(
    spot_id: str,
    max_images: int = 3,
    current_user: UserInDB = Depends(get_current_user)
):
    """Download images for a specific tourist spot"""
    if current_user.role not in [UserRole.ADMIN, UserRole.TRAVEL_COMPANY]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or travel companies can manage images"
        )
    
    from app.database import get_database
    from bson import ObjectId
    
    try:
        db = await get_database()
        spot = await db["tourist_spots"].find_one({"_id": ObjectId(spot_id)})
        
        if not spot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tourist spot not found"
            )
        
        spot_name = spot["name"]
        location = spot.get("region", "")
        
        # Download images
        image_paths = await image_manager.search_and_download_spot_images(
            spot_name, location, max_images
        )
        
        if image_paths:
            # Update database
            await image_manager.update_spot_images_in_db(spot_id, image_paths)
            
            return {
                "message": f"Downloaded {len(image_paths)} images for {spot_name}",
                "images": image_paths,
                "spot_id": spot_id
            }
        else:
            return {
                "message": "No images could be downloaded",
                "images": [],
                "spot_id": spot_id
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error downloading images: {str(e)}"
        )

@router.get("/serve/{image_path:path}")
async def serve_image(image_path: str):
    """Serve an image file"""
    full_path = image_manager.base_path / image_path
    
    if not full_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )
    
    return FileResponse(full_path)

@router.delete("/spots/{spot_id}/images/{image_name}")
async def delete_spot_image(
    spot_id: str,
    image_name: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete a specific image for a tourist spot"""
    if current_user.role not in [UserRole.ADMIN, UserRole.TRAVEL_COMPANY]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or travel companies can delete images"
        )
    
    from app.database import get_database
    from bson import ObjectId
    
    try:
        db = await get_database()
        spot = await db["tourist_spots"].find_one({"_id": ObjectId(spot_id)})
        
        if not spot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tourist spot not found"
            )
        
        # Find the image in spot's image_urls
        image_urls = spot.get("image_urls", [])
        image_path = f"spots/{image_name}"
        
        if image_path not in image_urls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found for this spot"
            )
        
        # Delete the file
        if image_manager.delete_image(image_path):
            # Remove from database
            updated_urls = [url for url in image_urls if url != image_path]
            await db["tourist_spots"].update_one(
                {"_id": ObjectId(spot_id)},
                {"$set": {"image_urls": updated_urls}}
            )
            
            return {
                "message": "Image deleted successfully",
                "deleted_image": image_path
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete image file"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting image: {str(e)}"
        )

@router.get("/spots/{spot_id}")
async def get_spot_images(
    spot_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get all images for a specific tourist spot"""
    from app.database import get_database
    from bson import ObjectId
    
    try:
        db = await get_database()
        spot = await db["tourist_spots"].find_one({"_id": ObjectId(spot_id)})
        
        if not spot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tourist spot not found"
            )
        
        image_urls = spot.get("image_urls", [])
        
        # Convert to full URLs
        base_url = "http://192.168.18.183:8000"  # This should come from config
        full_urls = [image_manager.get_image_url(path, base_url) for path in image_urls]
        
        return {
            "spot_id": spot_id,
            "spot_name": spot["name"],
            "images": full_urls,
            "image_count": len(full_urls)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving images: {str(e)}"
        )
