"""
OSS云存储服务工具
"""
from typing import Optional, Dict, Any
from datetime import datetime
from fractions import Fraction
import io
import numbers
from app.core.config import settings

try:
    import oss2
    OSS2_AVAILABLE = True
except ImportError:
    OSS2_AVAILABLE = False

try:
    from PIL import Image, ExifTags
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    ExifTags = None

try:
    import exifread
    EXIFREAD_AVAILABLE = True
except ImportError:
    EXIFREAD_AVAILABLE = False


def _has_fraction_attrs(value) -> bool:
    return hasattr(value, "numerator") and hasattr(value, "denominator")


def _make_serializable(value):
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8", errors="ignore")
        except Exception:
            return value.hex()
    if isinstance(value, numbers.Rational) or _has_fraction_attrs(value):
        numerator = int(getattr(value, "numerator", 0))
        denominator = int(getattr(value, "denominator", 1)) or 1
        return [numerator, denominator]
    if isinstance(value, (int, float, str)) or value is None:
        return value
    if isinstance(value, (list, tuple)):
        return [_make_serializable(v) for v in value]
    if isinstance(value, dict):
        return {k: _make_serializable(v) for k, v in value.items()}
    return str(value)


def _ratio_to_float(value) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, numbers.Rational) or _has_fraction_attrs(value):
        numerator = getattr(value, "numerator", None)
        denominator = getattr(value, "denominator", None)
        if denominator in (0, None):
            return None
        return float(numerator) / float(denominator)
    if isinstance(value, tuple) and len(value) == 2:
        numerator, denominator = value
        if denominator in (0, None):
            return None
        return float(numerator) / float(denominator)
    if isinstance(value, list) and len(value) == 2:
        numerator, denominator = value
        if denominator in (0, None):
            return None
        return float(numerator) / float(denominator)
    if isinstance(value, (list, tuple)) and len(value) == 1:
        return _ratio_to_float(value[0])
    if isinstance(value, str):
        stripped = value.strip().strip('[]')
        if not stripped:
            return None
        try:
            if '/' in stripped:
                return float(Fraction(stripped))
            return float(stripped)
        except Exception:
            return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _format_focal_length(value) -> Optional[str]:
    focal = _ratio_to_float(value)
    if focal is None:
        if not value:
            return None
        text = str(value).strip().strip('[]')
        if not text:
            return None
        return text if text.lower().endswith('mm') else f"{text}mm"
    if focal.is_integer():
        return f"{int(focal)}mm"
    return f"{focal:.1f}mm"


def _format_aperture(value) -> Optional[str]:
    aperture = _ratio_to_float(value)
    if aperture is None:
        if not value:
            return None
        text = str(value).strip().strip('[]')
        if not text:
            return None
        normalized = text.lower()
        return text if normalized.startswith("f/") else f"f/{text}"
    formatted = f"{aperture:.1f}".rstrip("0").rstrip(".")
    return f"f/{formatted}"


def _format_shutter_speed(value) -> Optional[str]:
    ratio = _ratio_to_float(value)
    if ratio is not None and ratio > 0:
        if ratio >= 1:
            if ratio.is_integer():
                return f"{int(ratio)}s"
            return f"{ratio:.2f}s"
        reciprocal = 1 / ratio
        rounded = round(reciprocal)
        if rounded >= 1 and abs(reciprocal - rounded) < 0.05:
            return f"1/{rounded}s"
        return f"{ratio:.4f}s"
    if isinstance(value, numbers.Rational):
        numerator = value.numerator
        denominator = value.denominator
        if denominator:
            return f"{numerator}/{denominator}s"
    if isinstance(value, (tuple, list)) and len(value) == 2:
        numerator, denominator = value
        if denominator:
            return f"{numerator}/{denominator}s"
    if isinstance(value, (int, float)) and value:
        return f"{value}s"
    if value:
        return str(value)
    return None


def _extract_iso(value) -> Optional[str]:
    if isinstance(value, (list, tuple)) and value:
        value = value[0]
    if isinstance(value, numbers.Rational):
        ratio = _ratio_to_float(value)
        if ratio is None:
            return None
        value = ratio
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return str(int(value))
    return str(value)


def _parse_exif_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    for fmt in ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def _extract_with_exifread(image_bytes: bytes) -> tuple[Optional[Dict[str, Any]], Dict[str, Optional[str]]]:
    if not EXIFREAD_AVAILABLE:
        return None, {}
    try:
        stream = io.BytesIO(image_bytes)
        tags = exifread.process_file(stream, details=False, strict=False)
    except Exception:
        return None, {}
    if not tags:
        return None, {}

    mapped: Dict[str, Any] = {}
    raw_values: Dict[str, Any] = {}

    def get_raw(*names: str):
        for name in names:
            if name in tags:
                tag = tags[name]
                value = getattr(tag, "values", tag)
                return value
        return None

    def get_printable(*names: str):
        for name in names:
            if name in tags:
                tag = tags[name]
                return str(tag)
        return None

    for key, tag in tags.items():
        value = getattr(tag, "values", tag)
        raw_values[key] = value
        mapped[key] = _make_serializable(value)

    summary = {
        "make": get_printable("Image Make") or get_printable("MakerNote"),
        "model": get_printable("Image Model"),
        "focal_length": _format_focal_length(
            get_raw("EXIF FocalLength", "EXIF LensInfo", "MakerNote TotalZoom")
        ),
        "aperture": _format_aperture(
            get_raw("EXIF FNumber", "EXIF ApertureValue", "EXIF MaxApertureValue")
        ),
        "shutter_speed": _format_shutter_speed(
            get_raw("EXIF ExposureTime", "EXIF ShutterSpeedValue")
        ),
        "iso": _extract_iso(
            get_raw("EXIF ISOSpeedRatings", "EXIF PhotographicSensitivity", "Image ISO")
        ),
        "shoot_time": _parse_exif_datetime(
            get_printable("EXIF DateTimeOriginal", "EXIF DateTimeDigitized", "Image DateTime")
        ),
    }
    return mapped, summary


def _extract_with_pillow(image_bytes: bytes) -> tuple[Optional[Dict[str, Any]], Dict[str, Optional[str]]]:
    if not PIL_AVAILABLE or ExifTags is None:
        return None, {}
    try:
        image = Image.open(io.BytesIO(image_bytes))
        exif_data = image.getexif()
    except Exception:
        return None, {}

    if not exif_data:
        return None, {}

    mapped: Dict[str, Any] = {}
    raw_values: Dict[str, Any] = {}

    for tag_id, value in exif_data.items():
        tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
        raw_values[tag_name] = value
        mapped[tag_name] = _make_serializable(value)

    summary = {
        "make": mapped.get("Make") or None,
        "model": mapped.get("Model") or None,
        "focal_length": _format_focal_length(raw_values.get("FocalLength")),
        "aperture": _format_aperture(raw_values.get("FNumber") or raw_values.get("ApertureValue")),
        "shutter_speed": _format_shutter_speed(raw_values.get("ExposureTime") or raw_values.get("ShutterSpeedValue")),
        "iso": _extract_iso(
            raw_values.get("ISOSpeedRatings")
            or raw_values.get("PhotographicSensitivity")
            or raw_values.get("ISO")
        ),
        "shoot_time": _parse_exif_datetime(
            mapped.get("DateTimeOriginal")
            or mapped.get("CreateDate")
            or mapped.get("DateTime")
        ),
    }
    return mapped, summary


def _extract_exif_metadata(image_bytes: bytes) -> tuple[Optional[Dict[str, Any]], Dict[str, Optional[str]]]:
    raw_exif, summary = _extract_with_exifread(image_bytes)
    if raw_exif:
        return raw_exif, summary
    return _extract_with_pillow(image_bytes)


class OSSService:
    """OSS服务类"""
    
    def __init__(self):
        if not OSS2_AVAILABLE:
            self.bucket = None
            self.enabled = False
            return
        
        if all([
            settings.OSS_ACCESS_KEY_ID,
            settings.OSS_ACCESS_KEY_SECRET,
            settings.OSS_BUCKET_NAME,
            settings.OSS_ENDPOINT
        ]):
            auth = oss2.Auth(settings.OSS_ACCESS_KEY_ID, settings.OSS_ACCESS_KEY_SECRET)
            self.bucket = oss2.Bucket(auth, settings.OSS_ENDPOINT, settings.OSS_BUCKET_NAME)
            self.enabled = True
        else:
            self.bucket = None
            self.enabled = False
    
    def upload_file(
        self,
        file_content: bytes,
        file_path: str,
        content_type: Optional[str] = None
    ) -> Optional[str]:
        """
        上传文件到OSS
        
        OSS会自动创建文件夹结构，路径中的"/"会被识别为文件夹分隔符
        例如: images/2025/11/file.jpg 会自动创建 images/2025/11/ 文件夹结构
        
        Args:
            file_content: 文件内容（字节）
            file_path: OSS中的文件路径（支持多级路径，如 images/2025/11/file.jpg）
            content_type: 文件MIME类型
            
        Returns:
            文件URL，如果上传失败返回None
        """
        if not self.enabled:
            return None
        
        try:
            # 确保路径格式正确（去除开头的/，确保路径规范）
            file_path = file_path.lstrip('/')
            
            headers = {}
            if content_type:
                headers['Content-Type'] = content_type
            
            # OSS会自动创建路径中的文件夹结构，无需手动创建
            self.bucket.put_object(file_path, file_content, headers=headers)
            
            if settings.OSS_BASE_URL:
                return f"{settings.OSS_BASE_URL.rstrip('/')}/{file_path.lstrip('/')}"
            else:
                return f"https://{settings.OSS_BUCKET_NAME}.{settings.OSS_ENDPOINT}/{file_path.lstrip('/')}"
        except Exception as e:
            print(f"OSS上传失败: {e}")
            return None
    
    def extract_oss_path(self, url: str) -> Optional[str]:
        """
        从完整的URL中提取OSS对象路径
        """
        if not url:
            return None
        
        # 去除查询参数
        clean_url = url.split('?', 1)[0]
        
        # 优先处理自定义CDN域名
        if settings.OSS_BASE_URL and clean_url.startswith(settings.OSS_BASE_URL):
            path = clean_url[len(settings.OSS_BASE_URL):]
            return path.lstrip('/')
        
        # 处理默认OSS域名
        if self.enabled and settings.OSS_BUCKET_NAME and settings.OSS_ENDPOINT:
            default_domain = f"https://{settings.OSS_BUCKET_NAME}.{settings.OSS_ENDPOINT}/"
            if clean_url.startswith(default_domain):
                path = clean_url[len(default_domain):]
                return path.lstrip('/')
        
        # 解析URL获取路径
        from urllib.parse import urlparse
        parsed = urlparse(clean_url)
        if parsed.path:
            return parsed.path.lstrip('/')
        
        return None

    def upload_image(
        self,
        image_content: bytes,
        file_path: str,
        max_size: Optional[tuple] = None,
        quality: int = 85
    ) -> Optional[dict]:
        """
        上传图片到OSS，支持压缩和缩略图生成
        
        Args:
            image_content: 图片内容（字节）
            file_path: OSS中的文件路径
            max_size: 最大尺寸 (width, height)，None表示不限制
            quality: JPEG质量（1-100）
            
        Returns:
            包含原图和缩略图URL的字典，如果上传失败返回None
        """
        if not self.enabled:
            return None
        
        if not PIL_AVAILABLE:
            return None
        
        try:
            raw_exif, exif_summary = _extract_exif_metadata(image_content)
            # 打开图片
            image = Image.open(io.BytesIO(image_content))
            original_format = image.format
            
            # 获取原始尺寸
            original_width, original_height = image.size
            
            # 如果需要压缩
            if max_size:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # 保存压缩后的图片
            output = io.BytesIO()
            if original_format == 'JPEG' or original_format == 'JPG':
                image.save(output, format='JPEG', quality=quality, optimize=True)
            elif original_format == 'PNG':
                image.save(output, format='PNG', optimize=True)
            else:
                # 转换为JPEG
                if image.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', image.size, (255, 255, 255))
                    if image.mode == 'P':
                        image = image.convert('RGBA')
                    background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                    image = background
                image.save(output, format='JPEG', quality=quality, optimize=True)
            
            compressed_content = output.getvalue()
            
            # 上传原图（或压缩后的图）
            image_url = self.upload_file(
                compressed_content,
                file_path,
                content_type=f"image/{original_format.lower() if original_format else 'jpeg'}"
            )
            
            if not image_url:
                return None
            
            result = {
                "url": image_url,
                "width": image.size[0],
                "height": image.size[1],
                "file_size": len(compressed_content)
            }

            if raw_exif:
                result["exif"] = raw_exif
            if exif_summary.get("make"):
                result["make"] = exif_summary["make"]
            if exif_summary.get("model"):
                result["model"] = exif_summary["model"]
            if exif_summary.get("focal_length"):
                result["focal_length"] = exif_summary["focal_length"]
            if exif_summary.get("aperture"):
                result["aperture"] = exif_summary["aperture"]
            if exif_summary.get("shutter_speed"):
                result["shutter_speed"] = exif_summary["shutter_speed"]
            if exif_summary.get("iso"):
                result["iso"] = exif_summary["iso"]
            if exif_summary.get("shoot_time"):
                result["shoot_time"] = exif_summary["shoot_time"].isoformat()
            
            # 生成高质量 WebP 缩略图
            # 增大缩略图尺寸以提高画质（从 400x400 提升到 1200x1200）
            thumbnail_size = (1200, 1200)
            thumbnail = image.copy()
            thumbnail.thumbnail(thumbnail_size, Image.Resampling.LANCZOS)
            
            # WebP 需要 RGB/RGBA 色彩空间
            if thumbnail.mode not in ("RGB", "RGBA"):
                thumbnail = thumbnail.convert("RGBA" if "A" in thumbnail.mode else "RGB")
            
            thumbnail_output = io.BytesIO()
            # 提高缩略图质量到 95（最高质量）
            thumbnail.save(
                thumbnail_output,
                format='WEBP',
                quality=95,  # 使用最高质量
                method=6  # 更高压缩质量
            )
            thumbnail_content = thumbnail_output.getvalue()
            
            # 上传缩略图（使用 .webp 后缀）
            base_path = file_path.rsplit('.', 1)[0]
            thumbnail_path = f"{base_path}_thumb.webp"
            thumbnail_url = self.upload_file(
                thumbnail_content,
                thumbnail_path,
                content_type="image/webp"
            )
            
            if thumbnail_url:
                result["thumbnail_url"] = thumbnail_url
            
            return result
            
        except Exception as e:
            print(f"图片上传失败: {e}")
            return None

    def analyze_image(self, image_content: bytes) -> Optional[dict]:
        """
        仅解析图片的基础信息与EXIF，不上传到 OSS。
        """
        if not PIL_AVAILABLE:
            return None

        try:
            raw_exif, exif_summary = _extract_exif_metadata(image_content)
            image = Image.open(io.BytesIO(image_content))
            width, height = image.size
            analysis: dict[str, Any] = {
                "width": width,
                "height": height,
                "file_size": len(image_content),
            }
            if raw_exif:
                analysis["exif"] = raw_exif
            if exif_summary.get("make"):
                analysis["make"] = exif_summary["make"]
            if exif_summary.get("model"):
                analysis["model"] = exif_summary["model"]
            if exif_summary.get("focal_length"):
                analysis["focal_length"] = exif_summary["focal_length"]
            if exif_summary.get("aperture"):
                analysis["aperture"] = exif_summary["aperture"]
            if exif_summary.get("shutter_speed"):
                analysis["shutter_speed"] = exif_summary["shutter_speed"]
            if exif_summary.get("iso"):
                analysis["iso"] = exif_summary["iso"]
            shoot_time = exif_summary.get("shoot_time")
            if shoot_time:
                analysis["shoot_time"] = shoot_time.isoformat()
            return analysis
        except Exception as exc:
            print(f"图片解析失败: {exc}")
            return None
    
    def delete_file(self, file_path: str) -> bool:
        """
        删除OSS中的文件
        
        Args:
            file_path: OSS中的文件路径
            
        Returns:
            是否删除成功
        """
        if not self.enabled:
            return False
        
        try:
            self.bucket.delete_object(file_path)
            return True
        except Exception as e:
            print(f"OSS删除失败: {e}")
            return False


# 创建全局OSS服务实例
oss_service = OSSService()

