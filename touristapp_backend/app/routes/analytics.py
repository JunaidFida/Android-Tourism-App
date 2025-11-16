from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.utils.security import get_current_user
from app.models.user import UserInDB, UserRole
from app.services.analytics_service import AnalyticsService
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/company/overview")
async def get_company_overview(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get overview analytics for travel company"""
    if current_user.role != UserRole.TRAVEL_COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only travel companies can access analytics"
        )
    
    overview = await AnalyticsService.get_company_overview(current_user.id)
    return overview

@router.get("/company/bookings")
async def get_booking_analytics(
    days: int = Query(30, description="Number of days to analyze"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get booking analytics for travel company"""
    if current_user.role != UserRole.TRAVEL_COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only travel companies can access analytics"
        )
    
    analytics = await AnalyticsService.get_booking_analytics(current_user.id, days)
    return analytics

@router.get("/company/revenue")
async def get_revenue_analytics(
    days: int = Query(30, description="Number of days to analyze"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get revenue analytics for travel company"""
    if current_user.role != UserRole.TRAVEL_COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only travel companies can access analytics"
        )
    
    revenue_data = await AnalyticsService.get_revenue_analytics(current_user.id, days)
    return revenue_data

@router.get("/company/packages/performance")
async def get_package_performance(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get performance analytics for company's packages"""
    if current_user.role != UserRole.TRAVEL_COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only travel companies can access analytics"
        )
    
    performance = await AnalyticsService.get_package_performance(current_user.id)
    return performance

@router.get("/admin/system")
async def get_system_analytics(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get system-wide analytics (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can access system analytics"
        )
    
    system_analytics = await AnalyticsService.get_system_analytics()
    return system_analytics

@router.get("/admin/user-activity")
async def get_user_activity(
    days: int = Query(30, description="Number of days to analyze"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get user login and activity analytics (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can access user activity analytics"
        )
    
    activity = await AnalyticsService.get_user_activity(days)
    return activity

@router.get("/admin/popular-spots")
async def get_popular_spots(
    limit: int = Query(10, description="Number of top spots to return"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get most visited tourist spots (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can access popular spots analytics"
        )
    
    popular_spots = await AnalyticsService.get_popular_spots(limit)
    return popular_spots
