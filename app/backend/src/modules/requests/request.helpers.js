import { prisma } from "../../config/prisma.js";

export const requestInclude = {
  workspace: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
  project: {
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
    },
  },
  requestType: true,
  priority: true,
  status: true,
  createdBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  assignedDepartment: true,
  privateMembers: {
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  attachments: {
    include: {
      uploadedBy: {
        select: {
          id: true,
          fullName: true,
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  },
};

export async function generateRequestCode() {
  const year = new Date().getFullYear();
  const count = await prisma.request.count({
    where: {
      requestCode: {
        startsWith: `REQ-${year}-`,
      },
    },
  });

  return `REQ-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function findStatusByCode(code) {
  return prisma.status.findUnique({
    where: { code },
  });
}

export async function createHistory({ requestId, actorId, action, oldValue, newValue, note }) {
  return prisma.requestHistory.create({
    data: {
      requestId,
      actorId,
      action,
      oldValue,
      newValue,
      note,
    },
  });
}
