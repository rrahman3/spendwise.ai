import React, { useEffect, useState } from "react";
import ReactCrop, { centerCrop, convertToPixelCrop, Crop, makeAspectCrop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

type ImageCropperModalProps = {
    imageUrl: string;
    onCancel: () => void;
    onSave: (croppedDataUrl: string) => void;
};

type AspectChoice = { label: string; value?: number };
const aspectOptions: AspectChoice[] = [
    { label: "Free", value: undefined },
    { label: "3:4", value: 3 / 4 },
    { label: "4:3", value: 4 / 3 },
    { label: "1:1", value: 1 },
    { label: "16:9", value: 16 / 9 },
];

const canvasFromCrop = (image: HTMLImageElement, crop: PixelCrop): string => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }
    const width = Math.max(1, Math.round(crop.width));
    const height = Math.max(1, Math.round(crop.height));
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        width,
        height
    );
    return canvas.toDataURL("image/jpeg", 0.9);
};

const makeCenteredCrop = (mediaWidth: number, mediaHeight: number, aspect?: number): Crop => {
    if (!aspect) {
        return { unit: "%", x: 5, y: 5, width: 90, height: 90 };
    }
    return centerCrop(
        makeAspectCrop(
            {
                unit: "%",
                width: 90,
                aspect,
            },
            mediaWidth,
            mediaHeight
        ),
        mediaWidth,
        mediaHeight
    );
};

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ imageUrl, onCancel, onSave }) => {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [safeUrl, setSafeUrl] = useState<string>(imageUrl);
    const [crop, setCrop] = useState<Crop>({ unit: "%", x: 5, y: 5, width: 90, height: 90, aspect: 3 / 4 });
    const [pixelCrop, setPixelCrop] = useState<PixelCrop | null>(null);
    const [aspect, setAspect] = useState<number | undefined>(3 / 4);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        let revokedUrl: string | null = null;
        let active = true;

        const hydrate = async () => {
            if (imageUrl.startsWith("data:")) {
                setSafeUrl(imageUrl);
                return;
            }
            try {
                const res = await fetch(imageUrl, { mode: "cors" });
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                revokedUrl = url;
                if (active) setSafeUrl(url);
            } catch (err) {
                console.error("Failed to fetch image for cropping", err);
                if (active) setSafeUrl(imageUrl);
            }
        };

        hydrate();

        return () => {
            active = false;
            if (revokedUrl) URL.revokeObjectURL(revokedUrl);
        };
    }, [imageUrl]);

    const handleImageLoad = (img: HTMLImageElement) => {
        setImage(img);
        const nextCrop = makeCenteredCrop(img.naturalWidth, img.naturalHeight, aspect);
        setCrop({ ...nextCrop, aspect });
        const pc = convertToPixelCrop(nextCrop, img.naturalWidth, img.naturalHeight);
        setPixelCrop(pc);
    };

    const handleAspectChange = (next: number | undefined) => {
        setAspect(next);
        if (image) {
            const nextCrop = makeCenteredCrop(image.naturalWidth, image.naturalHeight, next);
            setCrop({ ...nextCrop, aspect: next });
            const pc = convertToPixelCrop(nextCrop, image.naturalWidth, image.naturalHeight);
            setPixelCrop(pc);
        } else {
            setCrop((prev) => ({ ...prev, aspect: next }));
        }
    };

    const handleSave = () => {
        if (!image) {
            setError("Image not loaded yet. Please wait a moment and try again.");
            return;
        }
        const effectivePixelCrop =
            pixelCrop ?? convertToPixelCrop(crop, image.naturalWidth, image.naturalHeight);
        setIsSaving(true);
        setError(null);
        try {
            const dataUrl = canvasFromCrop(image, effectivePixelCrop);
            onSave(dataUrl);
        } catch (err) {
            console.error(err);
            setError("Could not crop image. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const aspectValue = aspect ?? "free";

    return (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-gray-200 flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">Crop receipt</p>
                        <p className="text-sm text-gray-500 font-semibold">Drag edges or corners. Choose any aspect or freeform.</p>
                    </div>
                    <button onClick={onCancel} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="relative flex-1 min-h-[320px] bg-gray-900 flex items-center justify-center">
                    {safeUrl ? (
                        <ReactCrop
                            crop={crop}
                            onChange={(c, percentCrop) => {
                                setCrop(c);
                                if (image) {
                                    const pc = convertToPixelCrop(percentCrop, image.naturalWidth, image.naturalHeight);
                                    setPixelCrop(pc);
                                }
                            }}
                            onComplete={(_, percentCrop) => {
                                if (image) {
                                    const pc = convertToPixelCrop(percentCrop, image.naturalWidth, image.naturalHeight);
                                    setPixelCrop(pc);
                                }
                            }}
                            onImageLoaded={handleImageLoad}
                            aspect={aspect}
                            keepSelection
                            style={{ maxHeight: "70vh" }}
                        >
                            <img
                                src={safeUrl}
                                alt="Receipt to crop"
                                onLoad={(e) => handleImageLoad(e.currentTarget)}
                                onError={() => setError("Could not load image for cropping. Check CORS/token.")}
                            />
                        </ReactCrop>
                    ) : (
                        <div className="text-white text-sm font-semibold">Loading image...</div>
                    )}
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white flex-wrap gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <label className="text-xs font-semibold text-gray-500">Aspect</label>
                        <select
                            value={aspectValue}
                            onChange={(e) => handleAspectChange(e.target.value === "free" ? undefined : Number(e.target.value))}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-1 font-semibold text-gray-700"
                        >
                            {aspectOptions.map((opt) => (
                                <option key={opt.label} value={opt.value ?? "free"}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        {error && <span className="text-xs text-red-500 font-semibold">{error}</span>}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`px-5 py-2 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-colors shadow-sm ${
                                isSaving ? "opacity-70 cursor-not-allowed" : ""
                            }`}
                        >
                            {isSaving ? "Saving..." : "Save crop"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageCropperModal;
