const { PrismaClient, Role } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // Seed candidates
  const candidate1 = await prisma.candidate.upsert({
    where: { nim: "123450050" },
    update: {},
    create: {
      name: "Ahmad Rizky",
      nim: "123450050",
      prodi: "S1 Sains Data",
      photo: "/candidate-1.jpg",
      visi:
        "Menghadirkan KM-ITERA yang aktif, progresif humanis, inklusif berlandaskan pada kepentingan mahasiswa dan masyarakat.",
      misi:
        "1. Aktif melakukan pengawalan isu di tingkat kampus, regional, nasional dan global sebagai bentuk sikap dan komitmen KM-ITERA.\n2. Mengakomodasi ekspresi mahasiswa dalam beragam ruang dan rupa.\n3. Membuka ruang yang komunikatif dan menyinergikan langkah serta pandangan berbagai elemen di dalam institut untuk kebermanfaatan mahasiswa dan masyrakat.\n4. Merestorasi nilai KM-ITERA sehingga mampu bergerak secara cepat dan jitu dalam menghadapi tantangan yang dinamis berlandaskan kesejahteraan dan pengembangan anggota",
      isActive: true,
    },
  });

  const candidate2 = await prisma.candidate.upsert({
    where: { nim: "123130039" },
    update: {},
    create: {
      name: "Kevin Andriano",
      nim: "123130039",
      prodi: "S1 Teknik Elektro",
      photo: "/candidate-2.jpg",
      visi:
        "Mewujudkan KM-ITERA yang harmonis, kolaboratif, dan berdampak nyata dalam membangun mahasiswa ITERA yang unggul, berdaya saing dan berkarakter, serta menjadi wadah dan pendamping bagi seluruh mahasiswa ITERA.",
      misi:
        "1. Membangun mahasiswa ITERA yang unggul, berdaya saing, dan berkarakter melalui pengembangan potensi, karya, dan kepedulian terhadap isu-isu kampus maupun bangsa.\n2. Menghadirkan gerakan yang harmonis dan kolaboratif dengan melibatkan seluruh elemen mahasiswa, HMPS, UKM, dan lembaga kemahasiswaan dalam setiap langkah KM-ITERA.\n3. Mewujudkan program dan kebijakan yang berdampak nyata bagi kebutuhan mahasiswa, terutama dalam peningkatan fasilitas, advokasi, dan kesejahteraan mahasiswa.\n4. Menjadi wadah, pendamping, dan pelindung bagi mahasiswa ITERA dalam menyuarakan aspirasi, memperjuangkan hak, serta membangun kebanggaan bersama terhadap almamater.",
      isActive: true,
    },
  });

  // Seed super admin user
  const superAdmin = await prisma.user.upsert({
    where: { nim: "1" },
    update: {
      name: "SUPER ADMIN",
      prodi: "S1 TEKNIK FISIKA",
      role: Role.SUPER_ADMIN,
    },
    create: {
      nim: "1",
      name: "SUPER ADMIN",
      prodi: "S1 TEKNIK FISIKA",
      role: Role.SUPER_ADMIN,
    },
  });

  // Seed admin user
  const adminUser = await prisma.user.upsert({
    where: { nim: "2" },
    update: {
      name: "ADMIN",
      prodi: "S1 TEKNIK FISIKA",
      role: Role.ADMIN,
    },
    create: {
      nim: "2",
      name: "ADMIN",
      prodi: "S1 TEKNIK FISIKA",
      role: Role.ADMIN,
    },
  });

  // Seed monitoring user
  const monitoringUser = await prisma.user.upsert({
    where: { nim: "3" },
    update: {
      name: "MONITORING",
      prodi: "S1 TEKNIK FISIKA",
      role: Role.MONITORING,
    },
    create: {
      nim: "3",
      name: "MONITORING",
      prodi: "S1 TEKNIK FISIKA",
      role: Role.MONITORING,
    },
  });

  console.log("Seed completed:", { candidate1, candidate2, superAdmin, adminUser, monitoringUser });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
