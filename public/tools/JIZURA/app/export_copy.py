"""Shared quality-first export copy for the browser editions."""

KEYS = [
    '高画質（推奨）',
    '軽量版（細部が失われる場合があります）',
    '標準画質',
    '自動画質（容量優先）',
    '書き出し設定',
    '容量は目安です。実際のサイズは内容により変わります。',
    '高画質の目安: ',
    '選択設定の目安: ',
    '容量を抑えます。細い文字・粒状感・速い動きの細部が失われる場合があります。',
    '画質を優先して書き出します。MP4 は圧縮動画です。容量は内容とブラウザにより変わります。',
    ' 粒状感が強いため、高画質を推奨します。',
]

COPY = {
    'en': [
        'High Quality (Recommended)', 'Compact (May Lose Detail)',
        'Standard Quality', 'Adaptive (Smaller Files)', 'Export Settings',
        'Size is an estimate. Actual size depends on the content.',
        'High quality estimate: ', 'Selected settings estimate: ',
        'Smaller files may lose detail in fine text, grain and fast motion.',
        'Prioritizes quality. MP4 is compressed video. Size varies with content and browser.',
        ' Strong grain detected; high quality is recommended.',
    ],
    'zh-Hans': [
        '高画质（推荐）', '轻量版（可能损失细节）', '标准画质',
        '自适应（体积优先）', '导出设置',
        '体积仅供参考，实际大小取决于画面内容。',
        '高画质预估: ', '当前设置预估: ',
        '减小文件体积，细小文字、颗粒和快速运动可能损失细节。',
        '优先保留画质。MP4 仍是压缩视频，体积随内容和浏览器而变化。',
        ' 检测到较强颗粒，建议使用高画质。',
    ],
    'zh-Hant': [
        '高畫質（推薦）', '輕量版（可能損失細節）', '標準畫質',
        '自適應（體積優先）', '匯出設定',
        '體積僅供參考，實際大小取決於畫面內容。',
        '高畫質預估: ', '目前設定預估: ',
        '減小檔案體積，細小文字、顆粒和快速運動可能損失細節。',
        '優先保留畫質。MP4 仍是壓縮影片，體積隨內容和瀏覽器而變化。',
        ' 偵測到較強顆粒，建議使用高畫質。',
    ],
    'ko': [
        '고화질 (권장)', '경량 (세부 묘사 손실 가능)', '표준 화질',
        '자동 (용량 우선)', '내보내기 설정',
        '예상 용량입니다. 실제 크기는 콘텐츠에 따라 달라집니다.',
        '고화질 예상: ', '선택 설정 예상: ',
        '작은 파일에서는 가는 글자, 입자와 빠른 움직임의 세부 묘사가 손실될 수 있습니다.',
        '화질을 우선합니다. MP4는 압축 영상이며 용량은 콘텐츠와 브라우저에 따라 달라집니다.',
        ' 입자가 강하므로 고화질을 권장합니다.',
    ],
    'id': [
        'Kualitas Tinggi (Disarankan)', 'Ringkas (Detail Bisa Berkurang)',
        'Kualitas Standar', 'Adaptif (Utamakan Ukuran)', 'Pengaturan Ekspor',
        'Ukuran hanya perkiraan. Ukuran sebenarnya bergantung pada konten.',
        'Perkiraan kualitas tinggi: ', 'Perkiraan pengaturan terpilih: ',
        'File kecil dapat mengurangi detail teks tipis, butiran, dan gerakan cepat.',
        'Mengutamakan kualitas. MP4 adalah video terkompresi. Ukuran bergantung pada konten dan browser.',
        ' Butiran kuat terdeteksi; kualitas tinggi disarankan.',
    ],
    'vi': [
        'Chất lượng cao (Khuyên dùng)', 'Gọn nhẹ (Có thể mất chi tiết)',
        'Chất lượng tiêu chuẩn', 'Thích ứng (Ưu tiên dung lượng)', 'Thiết lập xuất',
        'Dung lượng chỉ là ước tính. Kích thước thực tế phụ thuộc nội dung.',
        'Ước tính chất lượng cao: ', 'Ước tính thiết lập đã chọn: ',
        'Tệp nhỏ có thể mất chi tiết chữ mảnh, hạt và chuyển động nhanh.',
        'Ưu tiên chất lượng. MP4 vẫn là video nén. Dung lượng thay đổi theo nội dung và trình duyệt.',
        ' Phát hiện hạt mạnh; nên dùng chất lượng cao.',
    ],
}


def apply_quality_copy(namespace, code):
    values = COPY[code]
    assert len(values) == len(KEYS)
    namespace['BODY'].update(zip(KEYS[:8], values[:8]))
    namespace['UI'].update(zip(KEYS, values))
    maximum = {
        'en': 'Maximum Quality (Large File)',
        'zh-Hans': '最高画质（大文件）',
        'zh-Hant': '最高畫質（大檔案）',
        'ko': '최고 화질 (큰 파일)',
        'id': 'Kualitas Maksimum (File Besar)',
        'vi': 'Chất lượng tối đa (Tệp lớn)',
    }[code]
    for section in ('BODY', 'UI'):
        namespace[section]['最高画質（大容量）'] = maximum
