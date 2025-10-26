#!/bin/bash
echo "🚀 Deploying to S3..."
aws s3 sync "/Users/takahashiyuuki/Downloads/HTML-CSS-Webdesign Practice/imgcomparing-slider" s3://image-compare-slider.com/ --delete --exact-timestamps --exclude ".DS_Store"
echo "✅ Upload complete. Creating CloudFront invalidation..."
aws cloudfront create-invalidation --distribution-id E2UM6MVXV0CXMN --paths "/index.html" "/compare.css" "/js/*"
echo "🎉 Deployment finished!"