const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("开始填充种子数据...\n");

  // 创建管理员用户
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@novel.com" },
    update: {},
    create: {
      email: "admin@novel.com",
      username: "管理员",
      password: adminPassword,
      role: "ADMIN",
      bio: "平台管理员",
    },
  });
  console.log("  管理员账号: admin@novel.com / admin123");

  // 创建作者用户
  const authorPassword = await bcrypt.hash("author123", 10);
  const author = await prisma.user.upsert({
    where: { email: "author@novel.com" },
    update: {},
    create: {
      email: "author@novel.com",
      username: "墨白",
      password: authorPassword,
      role: "AUTHOR",
      bio: "专注玄幻小说创作",
    },
  });
  console.log("  作者账号: author@novel.com / author123");

  // 创建普通读者
  const readerPassword = await bcrypt.hash("reader123", 10);
  const reader = await prisma.user.upsert({
    where: { email: "reader@novel.com" },
    update: {},
    create: {
      email: "reader@novel.com",
      username: "书虫小李",
      password: readerPassword,
      role: "USER",
    },
  });
  console.log("  读者账号: reader@novel.com / reader123\n");

  // 创建测试小说
  const novel = await prisma.novel.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: "星辰大海",
      description: "一个少年从平凡走向浩瀚星空的传奇故事。在浩瀚的宇宙中，他是否能找到回家的路？",
      coverUrl: null,
      category: "科幻",
      status: "ONGOING",
      reviewStatus: "APPROVED",
      authorId: author.id,
      publishedAt: new Date(),
    },
  });
  console.log("  测试小说已创建: 《星辰大海》");

  // 创建测试章节
  for (let i = 1; i <= 3; i++) {
    await prisma.chapter.create({
      data: {
        novelId: novel.id,
        serialNumber: i,
        title: `第${i}章 启航`,
        content: `这是第${i}章的正文内容。星辰大海，征途漫漫...\n\n（此处为测试内容，请替换为实际小说章节。）`,
        publishedAt: new Date(Date.now() - (3 - i) * 86400000),
      },
    });
  }
  console.log("  已创建 3 个测试章节\n");

  // 创建测试评论
  await prisma.comment.create({
    data: {
      content: "写得真好，期待更新！",
      userId: reader.id,
      novelId: novel.id,
    },
  });
  console.log("  已创建测试评论");

  // 创建测试收藏
  await prisma.favorite.create({
    data: {
      userId: reader.id,
      novelId: novel.id,
    },
  });
  console.log("  已创建测试收藏\n");

  console.log("种子数据填充完成！");
  console.log("\n登录凭据：");
  console.log("  管理员: admin@novel.com / admin123");
  console.log("  作者:   author@novel.com / author123");
  console.log("  读者:   reader@novel.com / reader123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
