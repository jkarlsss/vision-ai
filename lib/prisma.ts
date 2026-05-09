import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";


type PrismaClientInstance = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClientInstance;
  prismaSchemaVersion?: string;
};

const prismaSchemaVersion = "20260509000000_add_project_specs";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  return databaseUrl;
}

function createPrismaClient() {
  const databaseUrl = getDatabaseUrl();

  if (databaseUrl.startsWith("prisma+postgres://")) {
    return new PrismaClient({ accelerateUrl: databaseUrl });
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
}

function shouldReusePrismaClient(client: PrismaClientInstance | undefined) {
  if (!client) {
    return false;
  }

  if (process.env.NODE_ENV !== "development") {
    return true;
  }

  return globalForPrisma.prismaSchemaVersion === prismaSchemaVersion;
}

export const prisma = shouldReusePrismaClient(globalForPrisma.prisma)
  ? globalForPrisma.prisma!
  : createPrismaClient();

if (process.env.NODE_ENV === "development") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = prismaSchemaVersion;
}
