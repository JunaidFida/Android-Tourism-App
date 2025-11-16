import os
import requests
import asyncio
from typing import List, Dict, Any, Optional
import hashlib
from urllib.parse import urlparse
from pathlib import Path
import aiohttp
import aiofiles
from PIL import Image
import io

class ImageManager:
    """Manages tourist spot images - downloading, storing, and serving"""
    
    def __init__(self, base_path: str = "static/images"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        self.spots_path = self.base_path / "spots"
        self.packages_path = self.base_path / "packages" 
        self.users_path = self.base_path / "users"
        
        for path in [self.spots_path, self.packages_path, self.users_path]:
            path.mkdir(exist_ok=True)
    
    def generate_filename(self, url: str, spot_name: str) -> str:
        """Generate a unique filename for an image"""
        # Create hash from URL for uniqueness
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        
        # Clean spot name for filename
        clean_name = "".join(c for c in spot_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        clean_name = clean_name.replace(' ', '_').lower()
        
        # Get file extension
        parsed_url = urlparse(url)
        ext = os.path.splitext(parsed_url.path)[1]
        if not ext:
            ext = '.jpg'  # Default extension
        
        return f"{clean_name}_{url_hash}{ext}"
    
    async def download_image(self, url: str, filename: str, subfolder: str = "spots") -> Optional[str]:
        """Download an image from URL and save it locally"""
        try:
            folder_path = self.base_path / subfolder
            file_path = folder_path / filename
            
            # Skip if file already exists
            if file_path.exists():
                return str(file_path.relative_to(self.base_path))
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=30) as response:
                    if response.status == 200:
                        content = await response.read()
                        
                        # Validate it's an image
                        try:
                            img = Image.open(io.BytesIO(content))
                            img.verify()
                        except Exception:
                            print(f"Invalid image format: {url}")
                            return None
                        
                        # Save the image
                        async with aiofiles.open(file_path, 'wb') as f:
                            await f.write(content)
                        
                        # Optimize image size
                        await self.optimize_image(file_path)
                        
                        return str(file_path.relative_to(self.base_path))
                    else:
                        print(f"Failed to download image: {url} (Status: {response.status})")
                        return None
                        
        except Exception as e:
            print(f"Error downloading image {url}: {str(e)}")
            return None
    
    async def optimize_image(self, file_path: Path, max_size: tuple = (800, 600), quality: int = 85):
        """Optimize image size and quality"""
        try:
            with Image.open(file_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # Resize if too large
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # Save optimized version
                img.save(file_path, 'JPEG', quality=quality, optimize=True)
                
        except Exception as e:
            print(f"Error optimizing image {file_path}: {str(e)}")
    
    async def search_and_download_spot_images(self, spot_name: str, location: str = "", max_images: int = 3) -> List[str]:
        """Search for and download images for a tourist spot"""
        # This is a placeholder for image search functionality
        # In production, you would integrate with:
        # - Unsplash API
        # - Pexels API
        # - Google Custom Search API
        # - Bing Image Search API
        
        search_queries = [
            f"{spot_name} {location} Pakistan",
            f"{spot_name} tourist destination",
            f"{spot_name} travel photography"
        ]
        
        downloaded_images = []
        
        # Sample URLs for demonstration (replace with actual search results)
        sample_urls = await self.get_sample_image_urls(spot_name)
        
        for i, url in enumerate(sample_urls[:max_images]):
            filename = self.generate_filename(url, f"{spot_name}_{i+1}")
            local_path = await self.download_image(url, filename, "spots")
            if local_path:
                downloaded_images.append(local_path)
        
        return downloaded_images
    
    async def get_sample_image_urls(self, spot_name: str) -> List[str]:
        """Get sample image URLs for demonstration purposes"""
        # This would be replaced with actual image search API calls
        
        # Sample high-quality tourism images from Pakistan
        sample_images = {
            "hunza valley": [
                "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800",
                "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800",
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"
            ],
            "badshahi mosque": [
                "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800",
                "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800"
            ],
            "k2 base camp": [
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
                "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800"
            ],
            "fairy meadows": [
                "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800",
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"
            ],
            "shalimar gardens": [
                "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800"
            ],
            "faisal mosque": [
                "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800"
            ],
            "mohenjo-daro": [
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"
            ],
            "swat valley": [
                "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800",
                "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800"
            ]
        }
        
        spot_key = spot_name.lower()
        for key in sample_images.keys():
            if key in spot_key:
                return sample_images[key]
        
        # Default images if no match found
        return [
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
            "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800"
        ]
    
    async def update_spot_images_in_db(self, spot_id: str, image_paths: List[str]):
        """Update tourist spot with downloaded image paths"""
        from app.database import get_database
        from bson import ObjectId
        
        db = await get_database()
        
        try:
            result = await db["tourist_spots"].update_one(
                {"_id": ObjectId(spot_id)},
                {"$set": {"image_urls": image_paths}}
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating spot images in DB: {str(e)}")
            return False
    
    async def process_all_spots(self):
        """Process all tourist spots and download images"""
        from app.database import get_database
        
        db = await get_database()
        processed_count = 0
        
        async for spot in db["tourist_spots"].find():
            spot_name = spot["name"]
            spot_id = str(spot["_id"])
            location = spot.get("region", "")
            
            print(f"Processing images for: {spot_name}")
            
            # Check if spot already has images
            if spot.get("image_urls") and len(spot["image_urls"]) > 0:
                print(f"  - Already has images, skipping")
                continue
            
            # Download images
            image_paths = await self.search_and_download_spot_images(spot_name, location)
            
            if image_paths:
                # Update database
                await self.update_spot_images_in_db(spot_id, image_paths)
                processed_count += 1
                print(f"  - Downloaded {len(image_paths)} images")
            else:
                print(f"  - No images downloaded")
            
            # Small delay to be respectful to image sources
            await asyncio.sleep(1)
        
        print(f"Processed images for {processed_count} spots")
        return processed_count
    
    def get_image_url(self, image_path: str, base_url: str = "http://192.168.18.183:8000") -> str:
        """Get full URL for serving an image"""
        return f"{base_url}/static/{image_path}"
    
    def delete_image(self, image_path: str) -> bool:
        """Delete an image file"""
        try:
            full_path = self.base_path / image_path
            if full_path.exists():
                full_path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Error deleting image {image_path}: {str(e)}")
            return False

# Global instance
image_manager = ImageManager()
