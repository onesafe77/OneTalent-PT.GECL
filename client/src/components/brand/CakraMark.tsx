// Lambang "Cakra" OneTalent — diambil dari prototipe desain (OneTalent.dc.html).
//
// Bentuknya kelopak bersusun mengelilingi titik pusat: 4 kelopak besar pada sumbu
// utama, 4 kelopak kecil pada sumbu diagonal, dan cincin luar tipis. Semua garis
// memakai `currentColor`, jadi warnanya mengikuti teks induknya — itu sebabnya ia
// bekerja di mode terang maupun gelap tanpa varian terpisah.
//
// Ketebalan garis diskalakan terhadap ukuran: pada ukuran kecil garis harus lebih
// tebal agar tetap terbaca, kalau tidak lambangnya hilang jadi noda abu.

interface CakraMarkProps {
    /** panjang sisi dalam piksel */
    size?: number;
    /** putar perlahan — dipakai saat memuat / berpikir */
    spin?: boolean;
    className?: string;
}

/** Ketebalan garis per ukuran, mengikuti tabel --sw di prototipe. */
function tebalGaris(size: number): number {
    if (size >= 200) return 1.1;
    if (size >= 64) return 1.5;
    if (size >= 48) return 2.1;
    if (size >= 40) return 2.4;
    if (size >= 30) return 2.9;
    if (size >= 20) return 3.7;
    return 4.6;
}

const KELOPAK_BESAR = "M50 36C60 27.9 60 16.56 50 9C40 16.56 40 27.9 50 36Z";
const KELOPAK_KECIL = "M50 36C56.8 31.2 56.8 24.48 50 20C43.2 24.48 43.2 31.2 50 36Z";

export function CakraMark({ size = 24, spin = false, className }: CakraMarkProps) {
    const sw = tebalGaris(size);
    return (
        <svg
            width={size} height={size} viewBox="0 0 100 100" aria-hidden="true"
            className={className}
            style={{
                display: "block", overflow: "visible", color: "currentColor",
                fill: "none", stroke: "currentColor", strokeWidth: sw,
                strokeLinejoin: "round", strokeLinecap: "round", flex: "0 0 auto",
            }}
        >
            <circle cx={50} cy={50} r={45} opacity={0.4} />
            <g style={spin ? { transformOrigin: "50px 50px", animation: "cakra-cw 8s linear infinite" } : undefined}>
                {[0, 90, 180, 270].map((d) => (
                    <path key={d} d={KELOPAK_BESAR} transform={`rotate(${d} 50 50)`} />
                ))}
            </g>
            <g opacity={0.6}
                style={spin ? { transformOrigin: "50px 50px", animation: "cakra-ccw 11s linear infinite" } : undefined}>
                {[45, 135, 225, 315].map((d) => (
                    <path key={d} d={KELOPAK_KECIL} transform={`rotate(${d} 50 50)`} />
                ))}
            </g>
            <circle cx={50} cy={50} r={3.4} fill="currentColor" stroke="none" />
        </svg>
    );
}

export default CakraMark;
