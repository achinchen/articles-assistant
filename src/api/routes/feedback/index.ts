import { Router } from 'express';
import { AnalyticsService } from '@/analytics/service';
import { ApiError } from '@/api/errors';

const router: Router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { queryLogId, rating, feedbackText, feedbackCategory } = req.body;
    
    if (!queryLogId || typeof queryLogId !== 'number') {
      throw new ApiError('VALIDATION_ERROR', 'queryLogId is required', 400);
    }
    
    if (!rating || ![1, -1].includes(rating)) {
      throw new ApiError('VALIDATION_ERROR', 'rating must be 1 or -1', 400);
    }
    
    await AnalyticsService.recordFeedback({
      queryLogId,
      rating,
      feedbackText,
      feedbackCategory,
      ipAddress: req.ip,
    });
    
    res.json({
      success: true,
      message: 'Feedback recorded',
    });
  } catch (error) {
    next(error);
  }
});

export default router;