"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function kaydetMalzeme(formData: FormData) {
  const idStr = formData.get("id") as string | null;
  const cins = formData.get("cins") as string;
  const standart = formData.get("standart") as string;
  const birim = formData.get("birim") as string;

  if (!cins || !standart || !birim) {
    throw new Error("Lütfen tüm zorunlu alanları doldurun.");
  }

  if (idStr) {
    const id = parseInt(idStr, 10);
    await prisma.malzeme.update({
      where: { id },
      data: { cins, standart, birim },
    });
  } else {
    await prisma.malzeme.create({
      data: { cins, standart, birim },
    });
  }

  revalidatePath("/malzeme-tipleri");
}

export async function silMalzeme(formData: FormData) {
  const idStr = formData.get("id") as string | null;

  if (!idStr) {
    throw new Error("Silinecek kayda ait ID bulunamadı.");
  }

  const id = parseInt(idStr, 10);

  await prisma.malzeme.delete({
    where: { id },
  });

  revalidatePath("/malzeme-tipleri");
}