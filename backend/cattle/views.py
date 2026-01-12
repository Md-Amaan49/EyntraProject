"""
Views for cattle profile management.
"""
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Cattle, CattleHistory
from .serializers import (
    CattleSerializer,
    CattleCreateSerializer,
    CattleUpdateSerializer,
    CattleHistorySerializer,
    CattleListSerializer
)
from users.permissions import IsOwner, IsOwnerOrReadOnly


class CattleListCreateView(generics.ListCreateAPIView):
    """
    List all cattle for the authenticated user or create a new cattle profile.
    
    GET /api/cattle/
    POST /api/cattle/
    """
    permission_classes = [IsAuthenticated, IsOwner]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CattleCreateSerializer
        return CattleListSerializer
    
    def get_queryset(self):
        """Return only non-archived cattle owned by the current user."""
        return Cattle.objects.filter(
            owner=self.request.user,
            is_archived=False
        ).select_related('owner')
    
    def create(self, request, *args, **kwargs):
        """Create a new cattle profile."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cattle = serializer.save()
        
        # Return full cattle details
        response_serializer = CattleSerializer(cattle)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )


class CattleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a cattle profile.
    
    GET /api/cattle/{id}/
    PUT /api/cattle/{id}/
    PATCH /api/cattle/{id}/
    DELETE /api/cattle/{id}/
    """
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CattleUpdateSerializer
        return CattleSerializer
    
    def get_queryset(self):
        """Return cattle owned by the current user."""
        return Cattle.objects.filter(owner=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete (archive) the cattle profile instead of permanent deletion."""
        cattle = self.get_object()
        cattle.archive()
        
        return Response({
            'message': 'Cattle profile archived successfully',
            'id': str(cattle.id)
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOwner])
def cattle_history(request, cattle_id):
    """
    Get update history for a specific cattle profile.
    
    GET /api/cattle/{cattle_id}/history/
    """
    # Verify cattle belongs to user
    cattle = get_object_or_404(
        Cattle,
        id=cattle_id,
        owner=request.user
    )
    
    # Get history records
    history = CattleHistory.objects.filter(cattle=cattle).select_related('changed_by')
    serializer = CattleHistorySerializer(history, many=True)
    
    return Response({
        'cattle_id': str(cattle.id),
        'identification_number': cattle.identification_number,
        'history': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOwner])
def restore_cattle(request, cattle_id):
    """
    Restore an archived cattle profile.
    
    POST /api/cattle/{cattle_id}/restore/
    """
    # Get archived cattle
    cattle = get_object_or_404(
        Cattle,
        id=cattle_id,
        owner=request.user,
        is_archived=True
    )
    
    cattle.restore()
    serializer = CattleSerializer(cattle)
    
    return Response({
        'message': 'Cattle profile restored successfully',
        'cattle': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOwner])
def archived_cattle(request):
    """
    List all archived cattle for the authenticated user.
    
    GET /api/cattle/archived/
    """
    cattle = Cattle.objects.filter(
        owner=request.user,
        is_archived=True
    ).select_related('owner')
    
    serializer = CattleListSerializer(cattle, many=True)
    
    return Response({
        'count': cattle.count(),
        'cattle': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated, IsOwner])
def cattle_image_update(request, cattle_id):
    """
    Update or delete cattle image.
    
    PUT /api/cattle/{cattle_id}/image/ - Update image
    DELETE /api/cattle/{cattle_id}/image/ - Remove image
    """
    # Get cattle
    cattle = get_object_or_404(
        Cattle,
        id=cattle_id,
        owner=request.user
    )
    
    if request.method == 'PUT':
        # Update image
        if 'image' not in request.FILES:
            return Response({
                'error': 'No image file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate and save new image
        try:
            cattle.image = request.FILES['image']
            cattle.save()
            
            serializer = CattleSerializer(cattle, context={'request': request})
            return Response({
                'message': 'Image updated successfully',
                'cattle': serializer.data
            }, status=status.HTTP_200_OK)
            
        except ValidationError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Remove image
        if cattle.image:
            cattle.image.delete(save=False)  # Delete file from storage
            cattle.image = None
            cattle.save()
            
            return Response({
                'message': 'Image removed successfully'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'message': 'No image to remove'
            }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOwner])
def cattle_stats(request):
    """
    Get statistics about user's cattle.
    
    GET /api/cattle/stats/
    """
    user_cattle = Cattle.objects.filter(owner=request.user, is_archived=False)
    
    stats = {
        'total_cattle': user_cattle.count(),
        'by_health_status': {
            'healthy': user_cattle.filter(health_status='healthy').count(),
            'sick': user_cattle.filter(health_status='sick').count(),
            'under_treatment': user_cattle.filter(health_status='under_treatment').count(),
        },
        'by_gender': {
            'male': user_cattle.filter(gender='male').count(),
            'female': user_cattle.filter(gender='female').count(),
        },
        'archived': Cattle.objects.filter(owner=request.user, is_archived=True).count()
    }
    
    return Response(stats, status=status.HTTP_200_OK)
