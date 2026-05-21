export type ScreeningQuestionCategory =
  | "recent_negative_event"
  | "self_evaluation"
  | "future_worry"
  | "perceived_failure"
  | "interpretation_of_others";

export type ScreeningQuestion = {
  question: string;
  category: ScreeningQuestionCategory;
  placeholder: string;
};

export type ScreeningTopicSlug =
  | "pendidikan"
  | "hubungan"
  | "keluarga"
  | "diri-sendiri"
  | "keuangan"
  | "kesehatan";

export const screeningTopicLabels: Record<ScreeningTopicSlug, string> = {
  pendidikan: "Pendidikan",
  hubungan: "Hubungan",
  keluarga: "Keluarga",
  "diri-sendiri": "Diri Sendiri",
  keuangan: "Keuangan",
  kesehatan: "Kesehatan",
};

const placeholderByCategory: Record<ScreeningQuestionCategory, string> = {
  recent_negative_event:
    "Ceritakan kejadian, situasi, dan pikiran yang muncul dengan bahasa sehari-hari...",
  self_evaluation:
    "Tuliskan penilaianmu tentang diri sendiri dan contoh situasi yang membentuknya...",
  future_worry:
    "Ceritakan kekhawatiran, bayangan, atau skenario yang muncul di pikiranmu...",
  perceived_failure:
    "Ceritakan pengalaman yang terasa tidak sesuai harapan dan makna yang kamu ambil...",
  interpretation_of_others:
    "Tuliskan situasinya dan bagaimana kamu menafsirkan sikap atau respons orang lain...",
};

function q(question: string, category: ScreeningQuestionCategory): ScreeningQuestion {
  return {
    question,
    category,
    placeholder: placeholderByCategory[category],
  };
}

export const fallbackScreeningTopic: ScreeningTopicSlug = "diri-sendiri";

export const screeningQuestionsByTopic: Record<ScreeningTopicSlug, ScreeningQuestion[]> = {
  pendidikan: [
    q("Sebutkan satu momen di lingkungan sekolah atau kampus belakangan ini yang banyak menguras energimu. Kejadiannya seperti apa, dan apa yang kamu pikirkan saat menghadapinya?", "recent_negative_event"),
    q("Ceritakan pengalaman akademik baru-baru ini yang tidak berjalan sesuai rencanamu. Apa hal pertama yang muncul di pikiranmu saat menyadari hal tersebut?", "recent_negative_event"),
    q("Bagaimana kamu memandang keseluruhan pencapaian belajarmu sejauh ini? Coba ceritakan satu momen spesifik di kampus yang paling membentuk pandanganmu itu.", "self_evaluation"),
    q("Ingat kembali momen spesifik saat kamu melihat daftar nilaimu semester ini. Apa yang kamu katakan pada dirimu sendiri di dalam hati mengenai hasil tersebut?", "self_evaluation"),
    q("Ceritakan momen di mana bayangan mengerjakan ujian akhir atau tugas akhir melintas di pikiranmu. Cerita apa yang kamu bangun di kepalamu mengenai proses itu nanti?", "future_worry"),
    q("Coba ingat satu situasi di kampus ketika kamu terdiam memikirkan tentang kelulusan nanti. Apa saja hal yang membuatmu khawatir dan bagaimana gambaran pikiranmu saat itu?", "future_worry"),
    q("Ingat kembali satu kejadian di kampus atau sekolah yang membuatmu merasa sangat kecewa pada diri sendiri. Kejadiannya seperti apa, dan kesimpulan apa yang muncul di benakmu?", "perceived_failure"),
    q("Ceritakan sebuah pengalaman spesifik di mana usahamu belajar berhari-hari terasa tidak membuahkan hasil. Pesan atau pikiran apa yang terlintas di kepalamu kala itu?", "perceived_failure"),
    q("Ceritakan kejadian spesifik ketika seorang pengajar memberikan kritik atau koreksi atas tugasmu. Bagaimana caramu menangkap maksud dan pandangan pengajar tersebut terhadapmu?", "interpretation_of_others"),
    q("Ceritakan satu interaksi dengan dosen atau guru yang membuatmu bertanya-tanya tentang penilaian mereka padamu. Apa yang kamu duga sedang mereka pikirkan tentang dirimu saat itu?", "interpretation_of_others"),
  ],
  hubungan: [
    q("Coba ingat kejadian belakangan ini di mana rencana dengan pasangan atau teman batal. Apa yang langsung muncul di kepalamu saat mengetahuinya?", "recent_negative_event"),
    q("Ingat kembali momen terakhir kali kamu berselisih paham dengan seseorang yang dekat denganmu. Bagaimana kejadiannya dan apa yang kamu pikirkan waktu itu?", "recent_negative_event"),
    q("Pikirkan tentang caramu menyelesaikan masalah dengan pasangan. Ceritakan satu kejadian, tindakan apa yang kamu ambil, dan apa kesimpulanmu tentang dirimu.", "self_evaluation"),
    q("Bagaimana pendapatmu tentang dirimu sebagai seorang pendengar bagi orang terdekat? Berikan contoh situasi nyata dan apa yang kamu pikirkan tentang hal itu.", "self_evaluation"),
    q("Ceritakan satu momen ketika kamu merasa khawatir akan kehilangan seseorang yang penting buatmu. Apa yang membuatmu memikirkan kemungkinan tersebut?", "future_worry"),
    q("Jika kamu membayangkan pertemananmu dalam beberapa tahun ke depan, situasi apa yang membuatmu cemas? Coba ceritakan apa yang sebenarnya kamu takutkan terjadi.", "future_worry"),
    q("Ceritakan satu situasi di mana kamu merasa hubunganmu jalan di tempat atau tidak berkembang. Apa yang membuatmu menyimpulkan hal tersebut?", "perceived_failure"),
    q("Ceritakan pengalaman saat usaha yang kamu lakukan untuk seseorang yang dekat tidak membuahkan hasil seperti harapanmu. Apa yang kamu pikirkan saat menyadarinya?", "perceived_failure"),
    q("Ketika seseorang membatalkan rencana kencan atau main secara mendadak, ceritakan satu kejadian spesifik yang pernah kamu alami. Bagaimana kamu menafsirkan alasan mereka?", "interpretation_of_others"),
    q("Ceritakan satu kejadian saat seseorang yang biasanya menghubungimu tiba-tiba diam atau membalas pesan sangat lama. Apa tebakanmu tentang alasan mereka bersikap begitu?", "interpretation_of_others"),
  ],
  keluarga: [
    q("Ingat-ingat momen terakhir kali kamu merasa suasana di rumah kurang nyaman. Situasinya seperti apa, dan apa yang kamu pikirkan tentang itu?", "recent_negative_event"),
    q("Ceritakan kejadian akhir-akhir ini saat ada rencana keluarga yang tidak berjalan sesuai harapanmu. Bagaimana tanggapanmu di dalam hati saat itu terjadi?", "recent_negative_event"),
    q("Bagaimana kamu melihat peranmu dalam keluarga saat ini? Coba ceritakan satu contoh kejadian yang membuatmu berpikir seperti itu.", "self_evaluation"),
    q("Coba ingat saat kamu merasa ada ekspektasi tertentu dari keluarga terhadapmu. Ceritakan satu momennya dan apa yang kamu pikirkan tentang dirimu saat itu.", "self_evaluation"),
    q("Kalau memikirkan masa depan hubunganmu dengan keluarga, hal apa yang paling menyita pikiranmu? Ceritakan satu situasi yang sering kamu bayangkan terkait hal ini.", "future_worry"),
    q("Ceritakan bayanganmu mengenai bagaimana keluargamu akan bereaksi jika suatu saat rencanamu berubah drastis. Situasi apa yang terbayang dan apa makna bayangan itu buatmu?", "future_worry"),
    q("Coba ceritakan satu situasi ketika bantuan yang kamu berikan ke keluarga ternyata tidak menyelesaikan masalah. Apa yang langsung muncul di pikiranmu waktu itu?", "perceived_failure"),
    q("Ingat-ingat kejadian di mana kamu merasa mengecewakan saudara atau anggota keluarga lainnya. Ceritakan apa yang terjadi dan bagaimana kamu memaknai kejadian tersebut.", "perceived_failure"),
    q("Ingat kejadian ketika sebuah keputusan keluarga diambil tanpa meminta pendapatmu. Apa yang sebenarnya terjadi, dan bagaimana kamu menafsirkan alasan mereka melakukan itu?", "interpretation_of_others"),
    q("Ingat saat anggota keluarga merespons ceritamu dengan nada bicara yang tidak biasa. Situasinya seperti apa, dan apa yang kamu pikirkan tentang maksud mereka?", "interpretation_of_others"),
  ],
  "diri-sendiri": [
    q("Ceritakan satu kejadian minggu ini yang membuatmu merasa sangat lelah secara pikiran. Apa yang sebenarnya sedang terjadi dan apa yang kamu pikirkan?", "recent_negative_event"),
    q("Ceritakan satu momen akhir-akhir ini ketika sesuatu tidak berjalan sesuai rencanamu. Apa yang ada di pikiranmu saat itu terjadi?", "recent_negative_event"),
    q("Ingat momen ketika kamu harus mengambil keputusan penting untuk hidupmu dan merasa ragu. Situasi apa yang melatarbelakanginya, dan pikiran apa yang dominan?", "self_evaluation"),
    q("Coba ingat momen saat kamu mengevaluasi pencapaian hidupmu sejauh ini. Dalam situasi apa itu terjadi, dan kesimpulan apa yang muncul di kepalamu?", "self_evaluation"),
    q("Ceritakan satu momen akhir-akhir ini ketika kamu tiba-tiba memikirkan masa depanmu. Apa yang memicu lamunan itu, dan skenario apa yang berputar di kepalamu?", "future_worry"),
    q("Ceritakan momen ketika kamu mempertimbangkan kembali tujuan atau cita-citamu. Peristiwa apa yang membuatmu berpikir ulang, dan apa yang kamu katakan pada dirimu sendiri?", "future_worry"),
    q("Ingat momen saat kamu merasa kurang puas dengan suatu karya atau tugas yang kamu kerjakan sendiri. Bagaimana ceritanya, dan pikiran apa yang dominan muncul?", "perceived_failure"),
    q("Ceritakan satu pengalaman spesifik di mana target pribadimu tidak terwujud. Bagaimana persisnya situasi saat itu, dan apa arti kejadian tersebut bagi dirimu?", "perceived_failure"),
    q("Pikirkan momen saat seseorang memberi komentar sekilas tentang penampilan atau sikapmu akhir-akhir ini. Apa konteksnya dan makna apa yang kamu tangkap dari ucapannya?", "interpretation_of_others"),
    q("Ceritakan pengalaman saat seseorang terdiam atau memberikan respons yang tidak biasa padamu. Situasi apa yang sedang terjadi, dan bagaimana kamu menafsirkan sikapnya terhadap dirimu?", "interpretation_of_others"),
  ],
  keuangan: [
    q("Ceritakan satu situasi akhir-akhir ini saat kamu merasa kesulitan mengatur uang. Apa yang terlintas di kepalamu saat menyadarinya?", "recent_negative_event"),
    q("Coba ceritakan momen saat pengeluaranmu ternyata lebih besar dari perkiraan. Apa yang muncul di pikiranmu waktu itu?", "recent_negative_event"),
    q("Bagaimana kamu menilai caramu mengelola keuangan selama ini? Ceritakan satu contoh kejadian konkret yang membuatmu memberikan penilaian tersebut.", "self_evaluation"),
    q("Ceritakan bagaimana pandanganmu tentang kemampuanmu menyisihkan uang atau menabung. Berikan satu contoh pengalaman nyata yang membentuk pandangan tersebut.", "self_evaluation"),
    q("Ketika membayangkan masa pensiun atau hari tuamu secara finansial, ceritakan hal apa yang terbayang di kepalamu. Bagaimana kamu merespons bayangan tersebut?", "future_worry"),
    q("Saat memikirkan kebutuhan finansialmu untuk beberapa tahun ke depan, ceritakan satu skenario yang paling sering terlintas. Apa yang kamu rasakan dan pikirkan tentang hal itu?", "future_worry"),
    q("Ceritakan satu momen ketika kamu merasa tidak mencapai target keuangan yang kamu rencanakan. Bagaimana kamu mengartikan kejadian tersebut di pikiranmu?", "perceived_failure"),
    q("Ingat kembali saat kamu membeli sesuatu yang pada akhirnya kamu sesali. Ceritakan situasinya secara singkat dan apa yang kamu pikirkan tentang keputusanmu itu.", "perceived_failure"),
    q("Ceritakan kejadian ketika seseorang mengomentari barang yang kamu beli atau caramu berbelanja. Apa yang kamu pikirkan tentang motif atau pandangan mereka terhadapmu?", "interpretation_of_others"),
    q("Ceritakan momen saat kamu tidak bisa ikut patungan atau memberi hadiah karena keterbatasan dana. Bagaimana pandanganmu tentang tanggapan orang lain saat kejadian itu?", "interpretation_of_others"),
  ],
  kesehatan: [
    q("Ceritakan momen akhir-akhir ini saat kamu merasa kondisi fisikmu sedang kurang prima. Apa yang terlintas di pikiranmu saat itu terjadi?", "recent_negative_event"),
    q("Ceritakan satu malam di minggu ini ketika kamu sulit tidur atau tidurmu terganggu. Apa yang kamu pikirkan saat sedang berbaring itu?", "recent_negative_event"),
    q("Coba deskripsikan pandanganmu tentang bentuk tubuhmu saat ini. Situasi sehari-hari seperti apa yang biasanya memicu pikiran-pikiran tersebut?", "self_evaluation"),
    q("Menurutmu, seberapa baik tubuhmu mendukung aktivitasmu sehari-hari? Coba ceritakan satu momen akhir-akhir ini yang menggambarkan penilaianmu ini.", "self_evaluation"),
    q("Coba ceritakan apa yang paling kamu khawatirkan mengenai kondisi kesehatanmu di masa depan. Kejadian apa yang biasanya memicu kekhawatiran ini?", "future_worry"),
    q("Ceritakan kekhawatiranmu tentang kemampuan fisikmu untuk melakukan hal-hal yang kamu sukai di masa depan. Momen apa yang membuatmu memikirkan ini?", "future_worry"),
    q("Ceritakan pengalaman saat tubuhmu tidak bisa melakukan aktivitas fisik yang biasanya terasa mudah. Bagaimana kamu mengartikan kejadian tersebut?", "perceived_failure"),
    q("Ceritakan momen saat kamu merasa usahamu untuk menyembuhkan suatu keluhan fisik atau rasa sakit terasa tidak membawa hasil. Apa yang kamu katakan pada dirimu?", "perceived_failure"),
    q("Ceritakan kejadian ketika seseorang mengomentari penampilan fisik atau bentuk tubuhmu. Bagaimana kamu menafsirkan maksud dari komentar tersebut?", "interpretation_of_others"),
    q("Saat kamu memilih atau menolak makanan tertentu di sebuah acara demi kesehatan, dan orang lain berkomentar, bagaimana kamu mengartikan komentar tersebut?", "interpretation_of_others"),
  ],
};

export function getScreeningQuestions(topicSlug: string): ScreeningQuestion[] {
  return (
    screeningQuestionsByTopic[topicSlug as ScreeningTopicSlug] ??
    screeningQuestionsByTopic[fallbackScreeningTopic]
  );
}

export function getScreeningTopicLabel(topicSlug?: string | null): string {
  if (!topicSlug) return "Screening";
  return (
    screeningTopicLabels[topicSlug as ScreeningTopicSlug] ??
    topicSlug.replace(/-/g, " ")
  );
}
