"use client";

import { useState } from "react";

const STORAGE_KEY_NAME = "petsubtitles_pet_name";
const STORAGE_KEY_GENDER = "petsubtitles_pet_gender";

const GENDER_OPTIONS = [
  { value: "male", label: "Boy" },
  { value: "female", label: "Girl" },
];

interface Props {
  petName: string;
  petGender: string;
  onNameChange: (name: string) => void;
  onGenderChange: (gender: string) => void;
}

export function loadSavedPersonalization(): { name: string; gender: string } {
  if (typeof window === "undefined") return { name: "", gender: "" };
  return {
    name: localStorage.getItem(STORAGE_KEY_NAME) || "",
    gender: localStorage.getItem(STORAGE_KEY_GENDER) || localStorage.getItem("petsubtitles_pet_pronouns") || "",
  };
}

export function savePersonalization(name: string, gender: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_NAME, name);
  localStorage.setItem(STORAGE_KEY_GENDER, gender);
}

export default function PersonalizeSection({
  petName,
  petGender,
  onNameChange,
  onGenderChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(!!petName);

  const handleNameChange = (name: string) => {
    const trimmed = name.slice(0, 20);
    onNameChange(trimmed);
    savePersonalization(trimmed, petGender);
  };

  const handleGenderChange = (gender: string) => {
    const newVal = gender === petGender ? "" : gender;
    onGenderChange(newVal);
    savePersonalization(petName, newVal);
  };

  return (
    <div className="px-3 py-1.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 text-sm font-semibold text-charcoal-light transition hover:text-charcoal"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        {petName ? `${petName}'s settings` : "Add your pet's name"}
      </button>

      {isOpen && (
        <div className="mt-2 animate-fade-in">
          <input
            type="text"
            value={petName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Biscuit"
            maxLength={20}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber focus:ring-2 focus:ring-amber/20"
          />
          <div className="mt-2 flex gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleGenderChange(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  petGender === opt.value
                    ? "bg-amber text-white"
                    : "bg-gray-100 text-charcoal-light hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
